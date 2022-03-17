#from django.core.exceptions import NON_FIELD_ERRORS
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.deletion import SET_NULL
from django.db.models import Sum

from django_countries.fields import CountryField

from adminas.constants import DOCUMENT_TYPES, NUM_BODY_ROWS_ON_EMPTY_DOCUMENT, SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, DEFAULT_LANG, INCOTERMS, DOC_CODE_MAX_LENGTH, ERROR_NO_DATA
from adminas.util import format_money, get_document_available_items, get_plus_prefix, copy_relations_to_new_document_version, debug
import datetime

from django.db.models import Q



# Size fields
JOB_NAME_LENGTH = 8 # YYMM-NNN
PART_NUM_LENGTH = 10
DOCS_ONE_LINER = 300 
SYSTEM_NAME_LENGTH = 50
LENGTH_SERIAL_NUMBER = 6
MAX_DIGITS_PRICE = 20
F_PRICE_LENGTH = MAX_DIGITS_PRICE + 1 + (MAX_DIGITS_PRICE / 3) # <- + 1 for the decimal symbol; MAX/3 as a lazy approximation for the thousands separator

COMPANY_NAME_LENGTH = 100
REGION_NAME_LENGTH = 100
PO_NAME_LENGTH = 50
PERSON_NAME_LENGTH = 100




class User(AbstractUser):
    todo_list_jobs = models.ManyToManyField('Job', related_name='users_monitoring')

class AdminAuditTrail(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='%(class)s_added', null=True)

    class Meta:
        abstract = True




# Customers and partners
class Company(AdminAuditTrail):
    """
        One Company.

        There are incoming FK links from Sites, which in turn have incoming FK links from Addresses.
        In this way a single Company can have multiple locations which can move geographically while 
        causing minimal disruption.
    """
    full_name = models.CharField(max_length=COMPANY_NAME_LENGTH)
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES, blank=True)
    is_agent = models.BooleanField(default=False)

    def __str__(self):
        if self.name == '':
            return self.full_name
        return self.name


class Address(AdminAuditTrail):
    """
        One Address, linked to a "Site".
        Note: Address reflects the street location; Site reflects its purpose/function within the Company.

        e.g. the Site record would reflect the concept of "CompanyX's Accounting Office", while 
        the Address reflects the concept of "35 Main Street".
    """
    # The general idea being that users issuing documents are more likely to know they need this 
    # made out to "CompanyX's Accounting Office" rather than a particular geographic location.

    site = models.ForeignKey('Site', on_delete=models.CASCADE, related_name='addresses')
    country = CountryField()
    region = models.CharField(max_length=REGION_NAME_LENGTH)
    postcode = models.CharField(max_length=10, blank=True)
    address = models.TextField()
    contact = models.CharField(max_length=PERSON_NAME_LENGTH, blank=True)

    def display_str_newlines(self):
        return f'{self.address},\n{self.region},\n{self.postcode},\n{self.country.name}'

    def as_dict(self):
        return {
            'address': self.address,
            'region': self.region,
            'postcode': self.postcode,
            'country': self.country.name        
        }


    def __str__(self):
        return f'({self.site.company.name}) {self.site.name} @ {self.created_on - datetime.timedelta(microseconds=self.created_on.microsecond)}'


class Site(AdminAuditTrail):
    """
        One Site, linked to a Company. There are incoming FK links from "Address".
        Note: Address is the street location; Site is its purpose/function within the Company.

        e.g. the Site record would reflect the concept of "CompanyX's Accounting Office", while 
        the Address reflects the concept of "35 Main Street".
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sites')
    name = models.CharField(max_length=COMPANY_NAME_LENGTH)

    default_invoice = models.BooleanField(default=False)
    default_delivery = models.BooleanField(default=False)

    def current_address(self):
        # If a site has moved around, the database may still contain all their old addresses for record-keeping purposes
        all_addresses = Address.objects.filter(site = self)

        if all_addresses.count() == 0:
            return None

        return Address.objects.filter(site = self).order_by('-created_by')[0]
 
    def __str__(self):
        if self.company.name == '':
            company = self.company.full_name
        else:
            company = self.company.name
        return f'({company}) {self.name}'
















# Stuff on offer
class Product(AdminAuditTrail):
    """
        One Product / standard item on sale.
    """

    available = models.BooleanField(default=True)

    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    part_number = models.CharField(max_length=PART_NUM_LENGTH) 
    origin_country = CountryField(blank=True)

    # Support for package deals and standard accessories
    includes = models.ManyToManyField('self', through='StandardAccessory')

    # Resale support
    #   resale_category is for "standard" resale discounts (each Product should only be in one category).
    #   special_resale is for when an agent negotiates something different (each Product could appear in multiple categories)
    # System will interpret resale_category = Null as 0% resale discount.
    resale_category = models.ForeignKey('ResaleCategory', on_delete=models.SET_NULL, related_name='members', null=True)
    special_resale = models.ManyToManyField('AgentResaleGroup', related_name='special_deal_products', blank=True)

    def get_price(self, currency, price_list):
        return Price.objects.filter(currency=currency).filter(price_list=price_list).get(product=self).value

    def get_description(self, lang):
        descriptions_qs = self.descriptions.filter(language=lang)

        if descriptions_qs.count() == 0:
            return 'Indescribable'

        return descriptions_qs.order_by('-last_updated')[0].description

    # Some products are incomplete in and of themselves: they have empty "slots" which must be filled with selected options.
    def is_modular(self):
        """
            Check for the presence of this Product as a parent in Slots.
        """
        return self.slots.all().count() > 0

    def __str__(self):
        return self.part_number + ': ' + self.name


class StandardAccessory(AdminAuditTrail):
    """
        When Item A is supplied with 2 x Item B at no extra charge, store the link between A, B and 2 right here.
    """
    parent = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    accessory = models.ForeignKey(Product, on_delete=models.SET_NULL, related_name='stdacc_for', null=True)
    quantity = models.IntegerField()

    def __str__(self):
        return f'{self.parent.name} includes {self.quantity} x {self.accessory.name}'


class Description(AdminAuditTrail):
    """
        One-liner document description of a Product, in a given language.
    """
    last_updated = models.DateTimeField(auto_now=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='descriptions')
    language = models.CharField(max_length=2, choices=SUPPORTED_LANGUAGES)
    description = models.CharField(max_length=DOCS_ONE_LINER)

    def __str__(self):
        return f'[{self.language}, {self.product.part_number}] {self.product.name}, {self.last_updated - datetime.timedelta(microseconds=self.last_updated.microsecond)}'


class ResaleCategory(AdminAuditTrail):
    """ 
        Standard resale discount rates by category 
    """
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    resale_perc = models.FloatField()

    def __str__(self):
        return self.name


class AgentResaleGroup(AdminAuditTrail):
    """ 
        Agent-specific resale discount group 
    """
    agent = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='resale_prices')
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    percentage = models.FloatField()

    def __str__(self):
        return f'{self.agent}, {self.percentage} on {self.name}%'


class PriceList(AdminAuditTrail):
    """
        Name and "valid_from" for a PriceList. Incoming FK from Prices.
    """
    valid_from = models.DateField()
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)

    def __str__(self):
        return self.name


class Price(models.Model):
    """
        PriceList line item. Store the link between the product, the numerical value, which currency that is and which 
        price list it belongs to.
    """
    price_list = models.ForeignKey(PriceList, on_delete=models.CASCADE, related_name = 'prices')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='list_prices')
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    def value_f(self):
        return format_money(self.value)

    def __str__(self):
        return f'{self.price_list.name} {self.product.name} @ {self.currency} {self.value}'




















# Support for modular ordering
class SlotChoiceList(models.Model):
    """
        Set of Products suitable for filling a Slot.
    """
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    choices = models.ManyToManyField(Product, related_name='in_slot_lists')

    def __str__(self):
        return self.name

class Slot(models.Model):
    """
        Describes an "empty spot" in a Product, which can/must be filled by another Product.

        e.g. Suppose the Product is hollow chocolate egg with space for 1 - 4 little toys inside (0 toys is forbidden
        for business reasons). "Toy-filled Chocolate Egg" would be the parent; the name might be something like "Toys Inside";
        required would be 1; optional would be 3; choice_group would be whichever "Choice Group" record reflects a list of all the suitable little toys.
    """
    parent = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='slots')
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)

    quantity_required = models.IntegerField()
    quantity_optional = models.IntegerField()
    choice_group = models.ForeignKey(SlotChoiceList, on_delete=SET_NULL, related_name='used_by', null=True)

    def choice_list(self):
        """
            Cut out the middle man and go straight to the list of valid slot fillers.
        """
        return self.choice_group.choices.all()

    def fillers_on_job(self, job):
        """
            Given a particular Job, return a list of Products *on that Job* which are suitable for filling this Slot.
        """
        result = []
        for product in self.choice_list():
            product_count = job.quantity_of_product(product)
            if product_count > 0:
                result.append(product)
    
        return result

    def __str__(self):
        return f'[{self.quantity_required} REQ, {self.quantity_optional} opt] {self.name} for {self.parent.name}'












# PO-specific stuff
# PO
class PurchaseOrder(AdminAuditTrail):
    """
        Data as it appeared on the customer's PO.
    """
    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='po')
    reference = models.CharField(max_length=PO_NAME_LENGTH)
    date_on_po = models.DateField()
    date_received = models.DateField()
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    # PO records are not deleted (for audit trail reasons); instead they are deactivated
    active = models.BooleanField(default=True)

    def value_f(self):
        return format_money(self.value)

    def __str__(self):
        return f'{self.reference} from {self.job.invoice_to.site.company.name}'


#Job stuff
class Job(AdminAuditTrail):
    """
        Reflects the concept of "one work thing we must enter into the system".
    """
    name = models.CharField(max_length=JOB_NAME_LENGTH)
    agent = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='jobs_sold',  blank=True, null=True)
    customer = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='jobs_ordered', blank=True, null=True)

    country = CountryField()
    language = models.CharField(max_length=2, choices=SUPPORTED_LANGUAGES, default=DEFAULT_LANG)

    invoice_to = models.ForeignKey(Address, on_delete=models.PROTECT, related_name='jobs_invoiced')
    delivery_to = models.ForeignKey(Address, on_delete=models.PROTECT, related_name='jobs_delivered')
    
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    quote_ref = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    payment_terms = models.TextField()
    
    incoterm_code = models.CharField(max_length=3, choices=INCOTERMS)
    incoterm_location = models.CharField(max_length=30)

    price_is_ok = models.BooleanField(default=False)


    def is_safe_to_delete(self):
        """
            Determines if this Job can be safely deleted or if it's passed the point of no return (from an administrative perspective).
        """
        # Condition #1: Job must not have any issued documents (since we want to keep a record of all documents that have been issued)
        docs = DocumentVersion.objects.filter(document__job=self)
        for d in docs:
            if d.issue_date != None and d.issue_date != '':
                return False

        # Condition #2: Job must not have any active POs (POs have accounting implications, so they must be "deactivated" first)
        porders = PurchaseOrder.objects.filter(job=self).filter(active=True)
        if porders.count() > 0:
            return False

        return True

        

    def quantity_of_product(self, product):
        """
            Modular item support. Count how many of a given Product exists on the Job. (It could be split across multiple line items.)
            Note: excludes standard accessories from the count because standard accessories are considered "part" of the parent item.
        """
        instances_of_product = JobItem.objects.filter(job=self).filter(product=product).filter(included_with = None)
        if instances_of_product.count() == 0:
            return 0
        return instances_of_product.aggregate(Sum('quantity'))['quantity__sum']


    def num_unassigned_to_slot(self, product):
        """
            Modular item support (children). How many are still available to be assigned to other slots?
        """
        job_qty = self.quantity_of_product(product)
        assignments = JobModule.objects.filter(parent__job=self).filter(child=product)
        if assignments.count() == 0:
            return job_qty

        a_qty = 0
        for assignment in assignments:
            a_qty += assignment.quantity * assignment.parent.quantity

        return job_qty - a_qty

    def modular_items_incomplete(self):
        """
            Check if modular items on the Job have any empty "required" slots
        """
        main_items = self.main_item_list()
        if main_items == None:
            return False
    
        for ji in main_items:
            if not ji.item_is_complete():
                return True
        return False


    def get_all_comments(self, user, setting_for_order_by):
        """
            Comment support. Get all comments the user is entitled to see, regardless of pinned/highlighted status
        """
        all_comments = JobComment.objects.filter(job=self).filter(Q(created_by=user) | Q(private=False)).order_by(setting_for_order_by)
        result = []
        for c in all_comments:
            result.append(c.get_display_dict(user))

        if(len(result) == 0):
            return None

        return result

    def get_pinned_comments(self, user, setting_for_order_by):
        """
            Comment support. Get all comments "pinned" by this User
        """
        all_comments = JobComment.objects.filter(job=self).filter(Q(created_by=user) | Q(private=False)).order_by(setting_for_order_by)
        result = []
        for c in all_comments:
            if c.is_pinned_by(user):
                result.append(c.get_display_dict(user))

        if(len(result) == 0):
            return None

        return result


    def get_highlighted_comments(self, user, setting_for_order_by):
        """
            Comment support. Get all comments "highlighted" by this User
        """
        all_comments = JobComment.objects.filter(job=self).filter(Q(created_by=user) | Q(private=False)).order_by(setting_for_order_by)
        result = []
        for c in all_comments:
            if c.is_highlighted_by(user):
                result.append(c.get_display_dict(user))

        if(len(result) == 0):
            return None

        return result        


    def on_todo_list(self, user):
        """
            To-do list. Check if this Job is on the todo list for the specified User
        """
        return self in user.todo_list_jobs.all()


    def num_admin_warnings(self):
        return len(self.admin_warnings()['strings']) + len(self.admin_warnings()['tuples'])

    def admin_warnings(self):
        """
            Produce a list of some things remaining to be done/resolved on this Job
        """
        result = {}

        result['strings'] = []
        if not self.price_is_ok:
            result['strings'].append('Price unconfirmed'.upper())
        
        if self.total_difference_value_po_vs_line() != 0:
            result['strings'].append('Price discrepancy (PO vs. line items)')

        if self.items.count() == 0:
            result['strings'].append('No items added')

        if self.modular_items_incomplete():
            result['strings'].append('Modular items incomplete')
        
        result['tuples'] = []
        qs = self.related_po()
        if qs.count() == 0:
            result['tuples'].append(('PO', 'none entered'))

        result['tuples'] += self.get_document_warnings()

        return result

    def get_document_warnings(self):
        """
            List of unfinished document business (unissued documents; unassigned items)
        """
        result = []
        for loop_tuple in DOCUMENT_TYPES:
            doc_type = loop_tuple[0]

            default_incl_items = self.get_items_unassigned_to_doc(doc_type)
            if len(default_incl_items) > 0 if default_incl_items != None else False:
                result.append((doc_type, 'items unassigned'))

            if self.unissued_documents_exist(doc_type):
                result.append((doc_type, 'documents unissued'))

        return result

    def unissued_documents_exist(self, doc_type):
        """
            Check the Job for for unissued documents of a specific type.
        """
        try:
            qs = self.related_documents()
            dvs = qs.filter(document__doc_type=doc_type)
        except DocumentVersion.DoesNotExist:
            return False

        return dvs.filter(issue_date = None).count() > 0




    def price_changed(self):
        """
            Make any necessary adjustments when something just happened that could impact the overall price of the Job.
        """

        if self.price_is_ok:
            self.price_is_ok = False
            self.save()


    def total_value(self):
        """
            Get the total value for this Job (number).
        """
        # Change this to whatever is going to be considered the "default" value for the order
        return self.total_po_value()

    def total_value_f(self):
        """
            Get the total value for this Job (formatted string).
        """
        return format_money(self.total_value())


    def total_list_price(self):
        """
            Get the total list price for this Job (number).
        """
        try:
            return sum([item.list_price() for item in self.items.filter(included_with=None)])
        except:
            return 0

    def total_list_price_f(self):
        """
            Get the total list price for this Job (formatted string).
        """
        return format_money(self.total_list_price())


    def total_line_value(self):
        """
            Get the total JobItem / line item sum for this Job (number).
        """
        order_value = self.items.aggregate(order_value=Sum('selling_price'))['order_value']
        if order_value == None:
            return 0
        else:
            return order_value

    def total_line_value_f(self):
        """
            Get the total JobItem / line item sum for this Job (formatted string).
        """
        return format_money(self.total_line_value())


    # Prices: value and string of all POs assigned to this Job
    def total_po_value(self):
        """
            Get the total PO sum for this Job (number).
        """
        try:
            return sum([po.value for po in self.po.all()])
        except:
            return 0

    def total_po_value_f(self):
        """
            Get the total PO sum for this Job (formatted string).
        """
        return format_money(self.total_po_value())


    # Price comparison: value, formatted string and formatted % for checking the PO total against JobItem total
    def total_difference_value_po_vs_line(self):
        """
            Get the difference between the Job's line item sum and the PO sum (value)
        """
        return self.total_po_value() - self.total_line_value()

    def total_po_difference_value_f(self):
        """
            Get the difference between the Job's line item sum and the PO sum (formatted string)
        """
        return format_money(self.total_difference_value_po_vs_line())

    def total_po_difference_perc(self):
        """
            Get the difference between the Job's line item sum and the PO sum (percentage)
        """
        if self.total_po_value() == 0 or self.total_po_value() == None:
            return 0
        return round( self.total_difference_value_po_vs_line() / self.total_po_value() * 100 , 2)



    # Price comparison: value, formatted string and formatted % for checking the list total against JobItem total
    def total_difference_value_line_vs_list(self):
        """
            Get the difference between the Job's line item sum and the list price sum (value)
        """
        return self.total_line_value() - self.total_list_price()

    def total_list_difference_value_f(self):
        """
            Get the difference between the Job's line item sum and the list price sum (formatted string)
        """
        return format_money(self.total_difference_value_line_vs_list())

    def total_list_difference_perc(self):
        """
            Get the difference between the Job's line item sum and the list price sum (percentage)
        """
        if self.total_list_price() == 0 or self.total_list_price() == None:
            return 0
        return round( self.total_difference_value_line_vs_list() / self.total_list_price() * 100, 2)



    def total_resale_price_f(self):
        """
            Get the Job's total resale value (formatted string)
        """
        return format_money(sum([item.resale_price() for item in self.items.all()]))






    def main_item_list(self):
        """
            List of only the JobItems which were entered by the user (i.e. excluding automatically added stdAccs)
        """
        item_list = JobItem.objects.filter(job=self).filter(included_with=None)
        if item_list.count() == 0:
            return None
        return item_list

    def related_documents(self):
        """
            List of documents related to this order
        """
        qs = DocumentVersion.objects.filter(document__job=self).filter(active=True)
        return qs.order_by('issue_date').order_by('document__doc_type')

    def related_po(self):
        """
            List of POs related to this order
        """
        return PurchaseOrder.objects.filter(job=self).filter(active=True).order_by('date_received')




    def get_items_unassigned_to_doc(self, doc_type):
        """
            Get a list of JobItems which have not yet been assigned to a document of this type.
            
            On a new document, this is used to pre-populate "Included" <ul>.
            On existing documents, used to get "excluded, but available" to populate the top of the "Excluded" <ul>.
        """
        result = get_document_available_items(self.main_item_list(), doc_type)
        return result


    def get_items_assigned_to_doc(self, doc_type):
        """
            Get a list of JobItems which have already been assigned to a document of this type.

            On a new document, this is used to pre-populate "Excluded" <ul>.
            On existing documents, (ab)used to populate the bottom of the "Excluded" <ul>.
        """        
        assigned_elsewhere = DocAssignment.objects\
                            .filter(version__document__job=self)\
                            .filter(version__document__doc_type=doc_type)\
                            .filter(version__active=True)\

        if assigned_elsewhere.all().count() == 0:
            return None

        result = []
        for ae in assigned_elsewhere.all():
            this_dict = {}
            this_dict['id'] = ae.pk
            this_dict['jiid'] = ae.item.pk
            this_dict['display'] = ae.item.display_str().replace(str(ae.item.quantity), str(ae.quantity))
            this_dict['is_available'] = False
            this_dict['used_by'] = ae.version.document.reference
            this_dict['doc_id'] = ae.version.id
            result.append(this_dict)                
        return result



    def __str__(self):
        return f'{self.name} {self.created_on}'








class JobComment(AdminAuditTrail):
    """
        A User's comment regarding a Job. Comments can be "private", "pinned" and/or "highlighted". 
        
        "Private", as you'd expect, determines whether the comment can be seen by anyone or just the author.
        
        "Pinned" and "highlighted" are used to emphasise chosen comments. In some ways they have similar effects:
        the main Job page and the Job comments page have a special panel for each, listing all comments
        with the relevant status.
        
        In addition to this:
            > "Pinned" comments also appear on the to-do list, at the bottom of the Job panel
            > "Highlighted" comments get special formatting (most noticably on the Job Comments page)

        The purpose of "pinned" is to "pin" the comment to the to-do list panel. This allows Users to add 
        reminders (e.g. "MUST ISSUE OC BY $DATE") and to add notes to help them distinguish between similar Jobs 
        (e.g. "Alice is chasing this one"; "Bob is chasing this one"). Analogue folks might think of it as a post-it
        stuck to the front of a cardboard folder.

        "Highlighted" is intended to allow the user to separate the comment-wheat from the comment-chaff without 
        spamming up the to-do list (e.g. "The order confirmation must be sent to email1 and email2" might be 
        highlight-worthy: you don't want that buried under back-and-forth comments, but you're probably only 
        interested in reading it when you're already looking at the Job page). Analogue folks might think 
        of this as taking a yellow highlighter pen to some written instructions.
    """

    contents = models.TextField()
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='comments')
    private = models.BooleanField(default=True)
    pinned_by = models.ManyToManyField(User, related_name='pinned_comments')
    highlighted_by = models.ManyToManyField(User, related_name='highlighted_comments')

    def is_highlighted_by(self, user):
        return user in self.highlighted_by.all()

    def is_pinned_by(self, user):
        return user in self.pinned_by.all()

    def get_display_dict(self, user):
        result = {}
        result['id'] = self.id
        result['user_is_owner'] = self.created_by == user
        result['created_by'] = self.created_by.username if self.created_by != user else 'You'
        result['created_on'] = self.created_on
        result['contents'] = self.contents
        result['private'] = self.private
        result['highlighted'] = self.is_highlighted_by(user)
        result['pinned'] = self.is_pinned_by(user)

        return result

    def __str__(self):
        return f'{self.created_by} on Job {self.job.name} @ {self.created_on}: "{self.contents[:15]}..."'









class JobItem(AdminAuditTrail):
    """
        One product on a Job.
    """
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='items')

    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True)
    price_list = models.ForeignKey(PriceList, on_delete=models.PROTECT, null=True)
    quantity = models.IntegerField(blank=True)
    selling_price = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    # Support for "nested" Products. e.g. suppose a Pez dispenser includes one "free" packet of Pez; you also sell additional packets of Pez separately;
    # customer has ordered one dispenser and 3 spare packets. Result = two JobItem records for Pez packets: one to cover the packet included 
    # with the dispenser ("included_with" would refer to the JobItem for the dispenser) and one to cover the three spares ("included_with" would be blank).
    included_with = models.ForeignKey('self', on_delete=models.CASCADE, related_name='includes', null=True, blank=True)

    def display_str(self):
        """
            The "main" description to appear on documents and the webpage.
        """
        return f'{self.quantity} x [{self.product.part_number}] {self.product.name}'


    def display_str_with_money(self):
        """
            Variation on the "main" description to appear on documents and the webpage.
            Adds money information at the end.
        """
        return f'{self.display_str()} @ {self.job.currency}&nbsp;{self.selling_price_f()}'
 

    def selling_price_f(self):
        """
            Format the selling price for display.
        """
        return format_money(self.selling_price)


    def list_price(self):
        """
            List price for this JobItem (value)
        """
        try:
            return self.quantity * Price.objects.filter(currency=self.job.currency).filter(price_list=self.price_list).get(product=self.product).value

        except:
            return None

    def list_price_f(self):
        """
            List price for this JobItem (formatted string)
        """
        return format_money(self.list_price())

    def resale_price(self):
        """ 
            Get current list price, in the Job currency, less resale discount (value)
        """
        list_price = self.list_price()
        if list_price == None:
            return None

        resale_multiplier = 1 - (self.resale_percentage() / 100)
        value = float(list_price) * float(resale_multiplier)
        return round(value, 2)

    def resale_price_f(self):
        """ 
            Get current list price, in the Job currency, less resale discount (formatted string)
        """
        return format_money(self.resale_price())

    def resale_percentage(self):
        """ 
            If the invoice is going to an agent, work out and report the resale discount percentage.
        """
        # End early if resale doesn't apply (because we're not invoicing an agent or because the product doesn't have one)
        if not self.job.invoice_to.site.company.is_agent or (self.product.resale_category == None and self.product.special_resale.all().count() == 0):
            return 0

        else:
            # If the agent has their own special deal, handle it
            deal = self.product.special_resale.filter(agent=self.job.invoice_to.site.company)
            if len(deal) != 0:
                return deal[0].percentage
            
            # Handle an agent on standard resale discount
            else:
                return self.product.resale_category.resale_perc


    def list_difference_value_f(self):
        """
            Difference between sum of JobItem selling price and list price (formatted string)
        """
        lp = self.list_price()
        if lp == None:
            return ERROR_NO_DATA
        diff = self.selling_price - lp
        return get_plus_prefix(diff) + format_money(diff)

    def resale_difference_value_f(self):
        """
            Difference between sum of JobItem selling price and resale price (formatted string)
        """
        rp = self.resale_price()
        if rp == None:
            return ERROR_NO_DATA
        diff = float(self.selling_price) - rp
        return get_plus_prefix(diff) + format_money(diff)

    def list_difference_perc(self):
        """
            Difference between sum of JobItem selling price and list price expressed as a percentage (value)
        """
        if self.selling_price == 0 or self.selling_price == None:
            return 0
        return round((self.selling_price - self.list_price())/self.selling_price*100, 2)

    def list_difference_perc_f(self):
        """
            Difference between sum of JobItem selling price and list price expressed as a percentage (formatted string)
        """
        return get_plus_prefix(self.list_difference_perc()) + format_money(self.list_difference_perc())

    def resale_difference_perc(self):
        """
            Difference between sum of JobItem selling price and resale price expressed as a percentage (value)
        """
        if self.selling_price == 0 or self.selling_price == None:
            return 0
        return round((float(self.selling_price) - self.resale_price())/float(self.selling_price)*100, 2)

    def resale_difference_perc_f(self):
        """
            Difference between sum of JobItem selling price and resale price expressed as a percentage (formatted string)
        """
        return get_plus_prefix(self.resale_difference_perc()) + format_money(self.resale_difference_perc())


    def add_standard_accessories(self):
        """
            Consult the product and quantity, then create additional JobItems to reflect the set of standard accessories supplied with this product.
            e.g. Suppose the Thingummy product is supplied with 3 x Widgets. Someone orders 2 x Thingummies. The system will store:
                > JobItem record for 2 x Thingummy
                > JobItem record for 6 x Widgets
        """
        stdAccs = StandardAccessory.objects.filter(parent=self.product)
        for stdAcc in stdAccs:
            sa = JobItem(
                created_by = self.created_by,
                job = self.job,
                product = stdAcc.accessory,
                price_list = self.price_list,
                quantity = stdAcc.quantity * self.quantity,
                selling_price = 0.00,
                included_with = self
            )
            sa.save()
    

    def reset_standard_accessories(self):
        """
            Delete all existing standard accessory JobItems linked to self and replace them with a fresh set.
            (For when a user edits the product on an existing JobItem, necessitating a completely different set)   
        """
        stdAccs = self.includes.all()
        if stdAccs.count() > 0:
            stdAccs.delete()
        self.add_standard_accessories()


    def update_standard_accessories_quantities(self):
        """
            Run through existing standard accessory JobItems linked to self and update the quantities.
            (For when a user edits the quantity on an existing JobItem, necessitating the same set but more/fewer)
        """
        for stdAcc in self.includes.all():
            accessory_obj = StandardAccessory.objects.filter(parent=self.product).filter(accessory=stdAcc.product)[0]
            qty_per_parent = accessory_obj.quantity
            if qty_per_parent == None:
                qty_per_parent = 0
            stdAcc.quantity = self.quantity * qty_per_parent
            stdAcc.save()

 
    def quantity_is_ok_for_modular_as_child(self, new_qty):
        """
            Modular: Child. When editing the qty, check the new qty is compatible with JobModule assignments
            (i.e. user hasn't subtracted so many that there aren't enough to fulfill all existing slot assignments)
        """        
        module_assignments = self.jobmodules_as_child()
        num_needed_for_assignments = 0
        if module_assignments.count() > 0:
            for ma in module_assignments:
                num_needed_for_assignments += ma.quantity * ma.parent.quantity
        
        product_qty_without_me = self.job.quantity_of_product(self.product) - self.quantity

        return product_qty_without_me + new_qty >= num_needed_for_assignments


    def quantity_is_ok_for_modular_as_parent(self, new_qty):
        """
            Modular: Parent. When editing the qty, check the new qty is compatible with JobModule assignments
            (i.e. user hasn't added so many that there aren't enough "children" to fulfill all existing slot assignments)       
        """
        for module_assignment in self.modules.all():
            total_quantity_needed = new_qty * module_assignment.quantity
            total_quantity_exists = self.job.quantity_of_product(module_assignment.child)
            if total_quantity_needed > total_quantity_exists:
                return False
        return True


    def module_data(self):
        """
            Modular: Child. Summary of module assignment status
        """
        result = {}
        result['product_total'] = self.job.quantity_of_product(self.product)
        result['num_unassigned'] = self.job.num_unassigned_to_slot(self.product)
        result['num_assigned'] = result['product_total'] - result['num_unassigned']
        return result


    def is_slot_filler(self):
        """
            Modular: Child. Check if this product has any assignments
        """
        return self.jobmodules_as_child().count() > 0


    def jobmodules_as_child(self):
        """
            Modular: Child. Get a list of relevant JobModules
        """
        return JobModule.objects.filter(parent__job=self.job).filter(child=self.product)


    def item_is_complete(self):
        """
            Modular: Parent. Is this a functional spec, with all required filled?
        """
        if self.product.is_modular():
            for slot in self.product.slots.all():
                if self.num_slot_children(slot) < slot.quantity_required:
                    return False
        return True


    # def all_optional_modules_assigned(self):
    #     """
    #         Modular: Parent. Are the optional slots all filled as well?
    #     """
    #     if self.product.is_modular():
    #         for slot in self.product.slots.all():
    #             if self.num_assigned(slot) < slot.quantity_required + slot.quantity_optional:
    #                 return False                
    #     return True


    def excess_modules_assigned(self):
        """
            Modular: Parent. The program allows users to exceed the required + optional total: 
            so this is used to find out if the user has taken advantage of that ability.
            
            (The purpose of allowing the user to exceed the maximum is to support the possibility of 
            customers ordering bespoke modifications to increase the slots on a product.)
        """
        if self.product.is_modular():
            for slot in self.product.slots.all():
                if self.get_num_excess(slot) > 0:
                    return True          
        return False   


    def num_slot_children(self, slot):
        """
            Modular: Parent. Use to find out number of children *per parent* for this slot.
        """
        assignments = JobModule.objects.filter(parent=self).filter(slot=slot)
        if assignments.count() == 0:
            qty_assigned = 0
        else:
            qty_assigned = assignments.aggregate(Sum('quantity'))['quantity__sum']
        return qty_assigned


    def get_slot_details_string_required(self, slot):
        """
            Modular: Parent. Slot status string for required, e.g. "1/3" = 1 filled, 3 required.
        """
        if self.product.is_modular():
            num_assignments = self.num_slot_children(slot)
            if num_assignments <= slot.quantity_required:
                result = num_assignments
            else:
                result = slot.quantity_required
            return f'{result}/{slot.quantity_required}'
        return ''


    def get_slot_details_string_optional(self, slot):
        """
            Modular: Parent. Slot status string for optional, e.g. "1/3" = 1 filled, 3 available (as standard).
        """
        if self.product.is_modular():
            num_assignments = self.num_slot_children(slot)    

            if num_assignments <= slot.quantity_required:
                result = 0
            elif num_assignments <= slot.quantity_required + slot.quantity_optional:
                result = num_assignments - slot.quantity_required
            else:
                result = slot.quantity_optional
            return f'{result}/{slot.quantity_optional}'
        return ''
    
    
    def get_num_excess(self, slot):
        """
            Modular: Parent. Get the number of excess assignments to this specific slot
        """
        if self.product.is_modular():
            num_assignments = self.num_slot_children(slot)  
            if num_assignments > slot.quantity_required + slot.quantity_optional:
                return num_assignments - slot.quantity_required - slot.quantity_optional
        return 0


    def get_slot_status_dictionary(self, slot):
        """
            Modular: Parent. Dict for updating the page after something slotty changes.
        """
        return {
            'jobitem_has_excess': self.excess_modules_assigned(),
            'slot_num_excess': self.get_num_excess(slot),
            'required_str': self.get_slot_details_string_required(slot),
            'optional_str': self.get_slot_details_string_optional(slot)
        }


    def __str__(self):
        return f'({self.job.name}) {self.quantity} x {self.product.name}'




class JobModule(models.Model):
    """
        Store one slot filler on a modular item.
    """
    parent = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='modules')
    child = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='module_assignment', null=True, blank=True)
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name='usages')
    quantity = models.IntegerField(default=1)

    def __str__(self):
        return f"[{self.parent.pk}] {self.parent.product.name}: {self.slot.name} slot filled by {self.child.name}"





class DocumentData(models.Model):
    """
        Document main class: one of these for each document
        (e.g. Suppose post-issuing changes were necessary, so there are multiple versions of a single document. 
        This class represents "a single document", the thing which links them)
    """
    reference = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    doc_type = models.CharField(max_length=DOC_CODE_MAX_LENGTH, choices=DOCUMENT_TYPES, null=True)
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name='documents')

    def __str__(self):
        return f'{self.doc_type} {self.reference}'



class DocumentVersion(AdminAuditTrail):
    """
        Document: one of these for each version of a document.
        (e.g. Suppose post-issuing changes were necessary, so there are multiple versions of a single document. 
        This class is what we use for each of the "multiple versions".)
    """
    document = models.ForeignKey(DocumentData, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    issue_date = models.DateField(null=True, blank=True)

    # This should be set to False in two situations: version is deleted; version is replaced.
    active = models.BooleanField(default=True)

    # On draft documents the final text hasn't been created yet, so this is where we store the "instructions" for where to find the text when the time comes to issue it.
    # On an issued document these would allow someone to lookup a list of documents based on the address or the JobItem (YAGNI, but it's here anyway...)
    invoice_to = models.ForeignKey(Address, on_delete=models.PROTECT, null=True, blank=True, related_name='financial_documents')
    delivery_to = models.ForeignKey(Address, on_delete=models.PROTECT, null=True, blank=True, related_name='delivery_documents')
    items = models.ManyToManyField(JobItem, related_name='on_documents', through='DocAssignment')


    def get_display_data_dict(self):
        """
            Retrieve data for populating a document, based on the current state of the database 
        """

        data = {}
        data['fields'] = self.get_doc_fields()

        data['issue_date'] = self.issue_date if self.issue_date != '' else None
        data['created_by'] = self.created_by
        data['doc_ref'] = self.document.reference
        data['title'] = dict(DOCUMENT_TYPES).get(self.document.doc_type)

        if self.issue_date != '' and self.issue_date != None:
            data['mode'] = 'issued'
        else:
            data['mode'] = 'preview'

        data['job_id'] = self.document.job.id
        data['version_id'] = self.id

        data['currency'] = self.document.job.currency
        data['total_value_f'] = self.total_value_f()

        data['invoice_to'] = self.invoice_to.display_str_newlines()
        data['delivery_to'] = self.delivery_to.display_str_newlines()
        
        data['instructions'] = []
        for instr in self.instructions.all():
            data['instructions'].append(instr.instruction)
        
        data['line_items'] = self.get_body_lines()
        data['css_filename'] = f'document_default_{self.document.doc_type.lower()}.css'
   
        return data      


    def get_doc_fields(self):
        """ 
            List of label/value pairs for a generic "fields" block on a document. ['h'] = label, ['body'] = value 
        """
        fields = []

        # Add purchase order info.
        # While most documents will relate to a single PO, some customers prefer to make modifications via additional PO/s rather than amending the first,
        # so this must also support making a list of POs.
        try:
            str = f'{self.document.job.po.all()[0].reference} dated {self.document.job.po.all()[0].date_on_po}'
            for po in self.document.job.po.all()[1:]:
                str += f', {po.reference} dated {po.date_on_po}'
        except IndexError:
            str = 'N/A'

        fields.append({
            'h': 'PO No.',
            'body': str
        })

        # Add estimated production date.
        try:
            prod_data = ProductionData.objects.filter(version=self)[0]
            date_sched = prod_data.date_scheduled
            date_req = prod_data.date_requested
        except IndexError:
            date_sched = 'TBC'
            date_req = 'Unknown'

        fields.append({
            'h': 'Requested Date',
            'body': date_req,
            'css_id': 'id_requested_date'
        })

        fields.append({
            'h': 'Estimated Date',
            'body': date_sched,
            'css_id': 'id_estimated_date'
        })

        # Add list of origin countries' full names, but only when needed
        if self.document.doc_type == 'OC':
            str = ''
            for i in self.items.all(): 
                if i.product.origin_country.name not in str:
                    if str != '':
                        str += ', '
                    str += i.product.origin_country.name
            fields.append({
                'h': 'Country of Origin',
                'body': str
            })

        return fields


    def save_issued_state(self):
        """
            Save a set of data used to populate a document as strings, so future updates to the database won't retroactively alter documents
        """
        data = self.get_display_data_dict()

        new_static_main = DocumentStaticMainFields(
            doc_version = self,
            issue_date = self.issue_date,
            created_by = data['created_by'],
            doc_ref = data['doc_ref'],
            title = data['title'],
            currency = data['currency'],
            total_value_f = data['total_value_f'],
            invoice_to = data['invoice_to'],
            delivery_to = data['delivery_to'],
            css_filename = data['css_filename']
        )
        new_static_main.save()

        for opt_field in data['fields']:
            new_static_fld = DocumentStaticOptionalFields(
                doc_version = self,
                h = opt_field['h'],
                body = opt_field['body'] if not opt_field['body'] == None else '?',
                css_id = opt_field['css_id'] if 'css_id' in opt_field else None
            )
            new_static_fld.save()
        
        for instr in data['instructions']:
            new_static_instr = DocumentStaticSpecialInstruction(
                doc_version = self,
                instruction = instr
            )
            new_static_instr.save()

        line_counter = 1
        for line_item in data['line_items']:
            new_static_line = DocumentStaticLineItem(
                doc_version = self,
                quantity = line_item['quantity'],
                part_number = line_item['part_number'],
                product_description = line_item['product_description'],
                price_list = line_item['price_list'],
                origin = line_item['origin'],
                list_price_f = line_item['list_price_f'],
                unit_price_f = line_item['unit_price_f'],
                total_price = line_item['total_price'],
                total_price_f = line_item['total_price_f'],
                line_number = line_counter
            )
            new_static_line.save()
            line_counter += 1

        return



    def get_issued_state(self):
        """
            Data for populating an issued document, based on the "static" records produced when the document was issued.
        """
        data = {}
        data['mode'] = 'issued'
        data['job_id'] = self.document.job.id
        data['version_id'] = self.id

        main = self.static_main_fields.all()[0]

        data['issue_date'] = main.issue_date
        data['created_by'] = main.created_by
        data['doc_ref'] = main.doc_ref
        data['title'] = main.title
        data['currency'] = main.currency
        data['total_value_f'] = main.total_value_f
        data['invoice_to'] = main.invoice_to
        data['delivery_to'] = main.delivery_to
        data['css_filename'] = main.css_filename
        
        data['fields'] = []
        for sof in self.static_optional_fields.all():
            fld_dict = {}
            fld_dict['h'] = sof.h
            fld_dict['body'] = sof.body
            fld_dict['css_id'] = sof.css_id
            data['fields'].append(fld_dict)

        data['instructions'] = []
        for instr in self.static_instructions.all():
            data['instructions'].append(instr.instruction)
        
        data['line_items'] = []
        try:
            static_line_items_sorted = DocumentStaticLineItem.objects.filter(doc_version=self).order_by('line_number')
        except DocumentStaticLineItem.DoesNotExist:
            return

        for sli in static_line_items_sorted:
            li_dict = {}
            li_dict['quantity'] = sli.quantity
            li_dict['part_number'] = sli.part_number
            li_dict['product_description'] = sli.product_description
            li_dict['origin'] = sli.origin
            li_dict['list_price_f'] = sli.list_price_f
            li_dict['unit_price_f'] = sli.unit_price_f
            li_dict['total_price'] = sli.total_price
            li_dict['total_price_f'] = sli.total_price_f
            li_dict['price_list'] = sli.price_list
            data['line_items'].append(li_dict)

        return data            


    def deactivate(self):
        """ 
            Deactivate instead of really deleting (for restoration purposes) 
        """
        self.active = False
        self.save()

    def reactivate(self):
        """ 
            Undo the deactivation 
        """
        self.active = True
        self.save()

    def get_replacement_version(self, user):
        """ 
            Make a copy of this DocumentVersion, but with the version number incremented and issue date removed: then deactivate self.

            Purpose:
            It's beneficial to keep a record of *all* PDFs that have been "released into the wild", regardless of whether or not they're correct.
            If anything, the incorrect ones are particularly valuable, since they can help explain why something or other went horribly wrong.
            To this end, edit-via-replacement is required for issued documents (rather than edit-by-overwrite).
        """
        r = DocumentVersion(
            created_by = user,
            document = self.document,
            version_number = self.version_number + 1,
            issue_date = None,
            active = True,
            invoice_to = self.document.job.invoice_to,
            delivery_to = self.document.job.delivery_to
        )
        r.save()

        copy_relations_to_new_document_version(DocAssignment.objects.filter(version=self), r)
        copy_relations_to_new_document_version(self.instructions.all(), r)
        copy_relations_to_new_document_version(self.production_data.all(), r)

        self.deactivate()

        return r

    def revert_to_previous_version(self):
        """ 
            Attempt to revert a replacement DocumentVersion.

            Note: this will fail in the event of the older version being incompatible with other currently active documents.

            Example/definition of "incompatible":
                Obviously duplication of items on documents = bad.

                As soon as the previous version of this document was deactivated, all its JobItems became "available" for assignment to 
                other documents: someone might've made use of that. The program therefore checks if all the JobItems on the previous version 
                are still available *now*. If not, the revert fails.

                If the user wishes to proceed with the revert, it is necessary to first deactivate/delete/edit other documents of the same 
                type such that all items featured on the previous version are available.
        """
        previous_qs = DocumentVersion.objects.filter(document=self.document).filter(version_number=self.version_number - 1)
        
        if previous_qs.count() == 0:
            return None
        
        previous = previous_qs.order_by('-created_on')[0]

        # Deactivate self in order to "free up" its item assignments before testing for a clash (otherwise "previous" can clash with "self", which would be silly)
        self.deactivate()

        # If previous clashes with other documents' item assignments, reactivate self and abort the revert
        if previous.item_assignments_clash():
            self.reactivate()
            return None

        # Otherwise, proceed with the revert.
        else:
            previous.reactivate()
            return previous



    def item_assignments_clash(self):
        """
            Check that there are no duplications of JobItems across documents of the same type.
        """
        for assignment in DocAssignment.objects.filter(version=self):
            if assignment.quantity > assignment.max_quantity_excl_self():
                debug(f'DocAssignment clash on item {assignment.item.id}: needs {assignment.quantity} but {assignment.max_quantity_excl_self()} available')
                return True

        return False
       


    def get_included_items(self):
        """
            List of JobItems assigned to this document version.
        """
        if self.items.all().count() == 0:
            return None

        else:
            assignments = DocAssignment.objects.filter(version=self)
            result = []
            for a in assignments:
                this_dict = {}
                this_dict['id'] = a.pk
                this_dict['jiid'] = a.item.id
                this_dict['total_quantity'] = a.max_quantity_excl_self() #a.item.quantity
                this_dict['display'] = a.item.display_str().replace(str(a.item.quantity), str(a.quantity))
                result.append(this_dict)
            return result


    def get_excluded_items(self):
        """
            List of JobItems excluded from this document version.
        """
        available = self.get_available_items()
        unavailable = self.get_unavailable_items()
        if available == None or self.id == None:
            return unavailable
        elif unavailable == None:
            return available
        else:
            return available + unavailable

    def get_empty_body_line(self):
        """
            Make a dict for displaying an empty row on a document.
        """
        empty_body_line = {}
        empty_body_line['quantity'] = ''
        empty_body_line['part_number'] = ''
        empty_body_line['product_description'] = ''
        empty_body_line['origin'] = ''
        empty_body_line['list_price_f'] = ''
        empty_body_line['unit_price_f'] = ''
        empty_body_line['total_price'] = 0
        empty_body_line['total_price_f'] = ''
        empty_body_line['price_list'] = ''

        return empty_body_line


    def get_body_lines(self):
        """
            Format JobItem data in a dict for display on a document.
        """
        # List of items assigned to this particular document.
        if self.items.all().count() == 0:
            result = []
            for x in range(0, NUM_BODY_ROWS_ON_EMPTY_DOCUMENT):
                result.append(self.get_empty_body_line())

            return result

        else:
            assignments = DocAssignment.objects.filter(version=self)
            result = []
            for a in assignments:
                main_item = {}
                main_item['quantity'] = a.quantity
                main_item['part_number'] = a.item.product.part_number
                main_item['product_description'] = a.item.product.get_description(self.document.job.language)
                main_item['origin'] = a.item.product.origin_country
                main_item['list_price_f'] = format_money(a.item.list_price() / a.item.quantity)
                main_item['unit_price_f'] = format_money(a.item.selling_price / a.item.quantity)
                main_item['total_price'] = a.quantity * (a.item.selling_price / a.item.quantity)
                main_item['total_price_f'] = format_money(a.quantity * (a.item.selling_price / a.item.quantity))
                main_item['price_list'] = a.item.price_list.name
                result.append(main_item)

                if a.item.includes.all().count() != 0:
                    std_acc_intro = self.get_empty_body_line()
                    std_acc_intro['product_description'] = 'which includes the following:'
                    result.append(std_acc_intro)

                    for std_acc in a.item.includes.all():
                        std_acc_dict = self.get_empty_body_line()
                        std_acc_dict['product_description'] = std_acc.display_str()
                        result.append(std_acc_dict)

            return result


    def get_available_items(self):
        """
            List of items assigned to this Job which have not yet been assigned to a document of this type.
            On a new document, the assumption is that the user is creating the new document to cover the leftover items, so this is used to populate the default "included" list.
            On an existing document, the user has already indicated which items they wish to include, so this is used to populate the top of the "excluded" list.
        """
        return get_document_available_items(self.document.job.main_item_list(), self.document.doc_type)


    def get_unavailable_items(self):
        """
            List of items already assigned to another document of this type.
            Used to populate the "excluded" list.
        """
        assigned_elsewhere = DocAssignment.objects\
                            .filter(version__document__job=self.document.job)\
                            .filter(version__document__doc_type=self.document.doc_type)\
                            .filter(version__active=True)\
                            .exclude(version=self)

        if assigned_elsewhere.all().count() == 0:
            return None

        result = []
        for ae in assigned_elsewhere.all():
            this_dict = {}
            this_dict['id'] = ae.pk
            this_dict['jiid'] = ae.item.pk
            this_dict['total_quantity'] = ae.item.quantity
            this_dict['display'] = ae.item.display_str().replace(str(ae.item.quantity), str(ae.quantity))
            this_dict['is_available'] = False
            this_dict['used_by'] = ae.version.document.reference
            this_dict['doc_id'] = ae.version.id
            result.append(this_dict)                
        return result


    def update_item_assignments_and_get_create_list(self, required):
        """
            Update or delete DocAssignments according to their difference to/absence from the "required" argument (which is a list).

            Following each update, the method removes the relevant dict from "required".
            What remains (and is returned) is a list of new DocAssignments requiring creation, for use elsewhere.

            Note: the "required" argument must be a list of dicts with two fields (id and quantity).
        """
        for ea in DocAssignment.objects.filter(version=self):
            found = False
            for req in required:
                if 'id' in req and int(req['id']) == ea.item.id:
                    # Case = UPDATE: assignment already exists. Update the quantity, if necessary, then check this off the to-do list.
                    found = True
                    if int(req['quantity']) != ea.quantity:
                        ea.quantity = min(int(req['quantity']), ea.max_quantity_excl_self())
                        ea.save()
                    required.remove(req)
                    break
            if not found:
                # Case = DELETE: existing assignment doesn't appear in the required list.
                ea.delete()
        return required


    def update_special_instructions_and_get_create_list(self, required):
        """
            Update or delete SpecialInstructions according to their difference to/absence from the "required" argument (which is a list).

            Following each update, the method removes the relevant dict from "required".
            What remains (and is returned) is a list of new SpecialInstructions requiring creation, for use elsewhere.

            Note: the "required" argument must be a list of dicts with two fields (id and quantity).
        """
        for ei in SpecialInstruction.objects.filter(version=self):
            found = False
            for req in required:
                if 'id' in req and int(req['id']) == ei.id:
                    found = True
                    ei.instruction = req['contents']
                    ei.save()
                    required.remove(req)
                    break
            if not found:
                ei.delete()
        return required


    def update_production_dates(self, form):
        """
            Find the ProductionData associated with this document and update it.
        """
        # Skip if this document type doesn't have production data associated with it under any circumstances
        if self.document.doc_type != 'WO':
            return

        else:
            # Look for ProductionData records for this document.
            proddata_qs = ProductionData.objects.filter(version=self)

            # Found 0: Create a new ProductionData record for this document
            if proddata_qs.count() == 0:              

                # No dates = don't bother
                if '' == form.cleaned_data['date_requested'] and '' == form.cleaned_data['date_scheduled']:
                    return

                if '' != form.cleaned_data['date_requested']:
                    req = form.cleaned_data['date_requested']
                else:
                    req = None

                if '' != form.cleaned_data['date_scheduled']:
                    sched = form.cleaned_data['date_scheduled']
                else:
                    sched = None

                this_pd = ProductionData(
                    version = self,
                    date_requested = req,
                    date_scheduled = sched
                )
                this_pd.save()

            # Found 1: Update/Delete it
            elif proddata_qs.count() == 1:
                this_pd = proddata_qs[0]

                # No dates = no ProductionData, so delete it
                if '' == form.cleaned_data['date_requested'] and '' == form.cleaned_data['date_scheduled']:
                    this_pd.delete()

                # Update the dates if they changed
                else:
                    something_changed = False

                    if this_pd.date_requested != form.cleaned_data['date_requested']:
                        this_pd.date_requested = form.cleaned_data['date_requested']
                        something_changed = True

                    if this_pd.date_scheduled != form.cleaned_data['date_scheduled']:
                        this_pd.date_scheduled = form.cleaned_data['date_scheduled']
                        something_changed = True
                    
                    if something_changed:
                        this_pd.save()   


    def update_requested_production_date(self, prod_data_form):
        """
            Find the ProductionData associated with this document and update it.
        """
        if self.document.doc_type == 'WO':
            proddata_qs = ProductionData.objects.filter(version=self)

            if proddata_qs.count() == 0:
                if '' != prod_data_form.cleaned_data['date_requested']:
                    prod_req = ProductionData(
                        version = self,
                        date_requested = prod_data_form.cleaned_data['date_requested'],
                        date_scheduled = None
                    )
                    prod_req.save()

            elif proddata_qs.count() == 1:
                prod_req = proddata_qs[0]

                if '' == prod_data_form.cleaned_data['date_requested']:
                    prod_req.delete()

                elif prod_req.date_requested != prod_data_form.cleaned_data['date_requested']:
                    prod_req.date_requested = prod_data_form.cleaned_data['date_requested']
                    prod_req.save()
        else:
            return


    def total_value(self):
        """
            Get the total sum of values of all line items on this specific document (value)
        """
        return sum(item['total_price'] for item in self.get_body_lines() if 'total_price' in item)

    def total_value_f(self):
        """
            Get the total sum of values of all line items on this specific document (formatted string)
        """
        return format_money(self.total_value())

    def __str__(self):
        return f'{self.document.doc_type} {self.document.reference} v{self.version_number} dated {self.issue_date}'


class DocAssignment(models.Model):
    """
        Through MTM for line item assignments to documents. 
    """
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE)
    item = models.ForeignKey(JobItem, on_delete=models.CASCADE)
    quantity = models.IntegerField()

    def max_quantity_excl_self(self):
        """
            Get the maximum quantity that could be assigned to self.
        """
        assignment_qs = DocAssignment.objects\
                    .filter(item=self.item)\
                    .filter(version__document__doc_type=self.version.document.doc_type)\
                    .filter(version__active=True)\
                    .exclude(id=self.id)

        if assignment_qs.count() == 0:
            qty_assigned = 0
        else:
            qty_assigned_dict = assignment_qs.aggregate(Sum('quantity'))
            qty_assigned = qty_assigned_dict['quantity__sum']

        return self.item.quantity - qty_assigned


    def __str__(self):
        return f'{self.quantity} x {self.item.product.name} assigned to {self.version.document.doc_type} {self.version.document.reference}'


class ProductionData(models.Model):
    """
        Information about production plans, to appear on work orders.
    """
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name='production_data')
    date_requested = models.DateField(blank=True, null=True)
    date_scheduled = models.DateField(blank=True, null=True)

    def __str__(self):
        return f'Production of {self.version.document.doc_type} {self.version.document.reference}. Req = {self.date_requested}, Sch = {self.date_scheduled}'


class SpecialInstruction(AdminAuditTrail):
    """
        Miscellaneous comments/statements. Can be added to any type of document.
    """
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name='instructions')
    instruction = models.TextField(blank=True)

    def __str__(self):
        return f'Note on {self.version.document.doc_type} {self.version.document.reference} by {self.created_by.username} on {self.created_on}'


class DocumentStaticMainFields(models.Model):
    """
        For issued documents. Store all the universal fields as they were at the time the document was issued.
    """
    doc_version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name='static_main_fields')

    issue_date = models.DateField()
    created_by = models.CharField(max_length=150) # max_length is from Django's User class
    doc_ref = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    title = models.CharField(max_length=150)
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES, blank=True)
    total_value_f = models.TextField(blank=True)
    invoice_to = models.TextField(blank=True)
    delivery_to = models.TextField(blank=True)
    css_filename = models.TextField(blank=True)

    def __str__(self):
        return f'Static main data for issued document {self.doc_version.document.reference}, version {self.doc_version.version_number} dated {self.doc_version.issue_date}'


class DocumentStaticOptionalFields(models.Model):
    """
        For issued documents. Store a heading/value/CSS ID set as it was at the time the document was issued.
    """
    doc_version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name='static_optional_fields')

    h = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    body = models.TextField()
    css_id = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True, null=True)

    def __str__(self):
        return f'Static optional field ({self.h}) for issued document {self.doc_version.document.reference}, version {self.doc_version.version_number} dated {self.doc_version.issue_date}'


class DocumentStaticSpecialInstruction(models.Model):
    """
        For issued documents. Store a single special instruction as it was at the time the document was issued.
    """
    doc_version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name='static_instructions')
    instruction = models.TextField()

    def __str__(self):
        return f'Static special instruction for issued document {self.doc_version.document.reference}, version {self.doc_version.version_number} dated {self.doc_version.issue_date}'


class DocumentStaticLineItem(models.Model):
    """
        For issued documents. Store a single line item as it was at the time the document was issued.
    """
    doc_version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name='static_line_items')

    quantity = models.TextField(blank=True)
    part_number = models.CharField(max_length=PART_NUM_LENGTH, blank=True)
    product_description = models.CharField(max_length=DOCS_ONE_LINER)
    origin = models.TextField(blank=True)
    price_list = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    list_price_f = models.TextField(blank=True)
    unit_price_f = models.TextField(blank=True)
    total_price = models.TextField(blank=True)
    total_price_f = models.TextField(blank=True)
    line_number = models.IntegerField()

    def __str__(self):
        return f'Static line item #{self.line_number} for issued document {self.doc_version.document.reference}, version {self.doc_version.version_number} dated {self.doc_version.issue_date}'






