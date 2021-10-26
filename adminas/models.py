from django.core.exceptions import NON_FIELD_ERRORS
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.aggregates import Max
from django.db.models.deletion import SET_NULL
from django.db.models.fields import CharField
from django.db.models import Sum

from django_countries.fields import CountryField

from decimal import Decimal
from adminas.constants import DOCUMENT_TYPES, SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, DEFAULT_LANG, INCOTERMS, UID_CODE_LENGTH, UID_OPTIONS, DOC_CODE_MAX_LENGTH
from adminas.util import format_money, get_document_available_items, get_plusminus_prefix, debug, copy_relations_to_new_document_version, get_empty_comment_section_dict
import datetime
import re

# Used for the third-party info for companies
from django.db.models import Q
from django.db.models import F

# Copied from views.py due to moving info processing for document to the model
from adminas.constants import MAX_ROWS_OC

# Size fields
JOB_NAME_LENGTH = 8 # YYMM-NNN
PART_NUM_LENGTH = 10
DOCS_ONE_LINER = 300 # <- placeholder value until I check how many 'M's and how many 'i's fit on a single line, then pick something sorta in the middle
SYSTEM_NAME_LENGTH = 50
LENGTH_SERIAL_NUMBER = 6
MAX_DIGITS_PRICE = 20
F_PRICE_LENGTH = MAX_DIGITS_PRICE + 1 + (MAX_DIGITS_PRICE / 3) # <- + 1 for the decimal symbol; MAX/3 as a rough approximation for the thousands separator

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


# "System data" tables. That is, stuff that should already be in place when you begin processing a PO
# Customers and partners
class Company(AdminAuditTrail):
    full_name = models.CharField(max_length=COMPANY_NAME_LENGTH)
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES, blank=True)

    is_agent = models.BooleanField(default=False)

    def invoice_address(self):
        inv_site = self.sites.filter(default_invoice=True)[0]
        return inv_site.current_address()
 
    def third_parties(self):
        """
            List of third-party Companies associated with this Company.

        """
        self_jobs = Job.objects.filter(Q(agent=self) | Q(customer=self))
        invoice_ids = self_jobs.filter( ~Q(invoice_to__site__company = F('agent')) & ~Q(invoice_to__site__company = F('customer')) ).values_list('invoice_to__site__company__id', flat=True)
        delivery_ids = self_jobs.filter( ~Q(delivery_to__site__company = F('agent')) & ~Q(delivery_to__site__company = F('customer')) ).values_list('delivery_to__site__company__id', flat=True)

        ids = list(invoice_ids) + list(delivery_ids)

        return Company.objects.filter(id__in=ids).order_by('name')


    def __str__(self):
        if self.name == '':
            return self.full_name
        return self.name

class Address(AdminAuditTrail):
    site = models.ForeignKey('Site', on_delete=models.CASCADE, related_name='addresses')
    country = CountryField()
    region = models.CharField(max_length=REGION_NAME_LENGTH)
    postcode = models.CharField(max_length=10, blank=True)
    address = models.TextField()
    contact = models.CharField(max_length=PERSON_NAME_LENGTH, blank=True)

    valid_until = models.DateField(blank=True, null=True)

    def display_str_newlines(self):
        return f'{self.address}\n{self.region}\n{self.postcode}\n{self.country.name}'

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
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sites')
    name = models.CharField(max_length=COMPANY_NAME_LENGTH)

    default_invoice = models.BooleanField(default=False)
    default_delivery = models.BooleanField(default=False)

    def current_address(self):
        # If a site has moved around, the database should contain all their old addresses, with all but one having a "valid_until" date.
        # Usually the current_address is whichever one has valid_until = None.
        # Two edge cases:   1) Someone added a future valid_until date when the move was announced: site hasn't moved yet
        #                   2) The site has closed permanently, so their old address is no longer valid, but there's no new one to replace it

        return Address.objects.filter(site = self).order_by('-created_by')[0]
        # addr_last_invalidated = Address.objects.filter(site = self).filter(valid_until != None).order_by('-valid_until')[0]

        # if addr_last_invalidated.valid_until <= datetime.datetime.today():
        #     try:
        #         # Case: Usual
        #         return Address.objects.filter(site=self).get(valid_until=None)
        #     except:
        #         # Case: Closed permanently
        #         return addr_last_invalidated
        # else:
        #     # Case: Window between notification and moving
        #     return addr_last_invalidated




    def __str__(self):
        if self.company.name == '':
            company = self.company.full_name
        else:
            company = self.company.name
        return f'({company}) {self.name}'
















# Stuff on offer
class Product(AdminAuditTrail):
    available = models.BooleanField(default=True)

    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    part_number = models.CharField(max_length=PART_NUM_LENGTH)

    # Some products have an ID for each individual item; some have an ID for a batch; others have no ID at all
    id_type = models.CharField(max_length=UID_CODE_LENGTH, choices=UID_OPTIONS)

    hs_code = models.CharField(max_length=10, blank=True)
    origin_country = CountryField(blank=True)

    # Support for package deals and standard accessories
    includes = models.ManyToManyField('self', through='StandardAccessory', related_name='supplied_with')

    # Resale support
    #   resale_category is for "standard" resale discounts (each Product should only be in one category).
    #   special_resale is for when an agent negotiates something different.
    # System will interpret resale_category = Null as 0% resale discount.
    resale_category = models.ForeignKey('ResaleCategory', on_delete=models.SET_NULL, related_name='members', null=True)
    special_resale = models.ManyToManyField('AgentResaleGroup', related_name='special_deal_products', blank=True)

    def get_price(self, currency, price_list):
        return Price.objects.filter(currency=currency).filter(price_list=price_list).get(product=self).value

    def get_description(self, lang):
        return self.descriptions.filter(language=lang).order_by('-last_updated')[0].description

    def is_modular(self):
        return self.slots.all().count() > 0

    def __str__(self):
        return self.part_number + ': ' + self.name


class StandardAccessory(AdminAuditTrail):
    parent = models.ForeignKey(Product, on_delete=models.SET_NULL, related_name='my_stdaccs', null=True)
    accessory = models.ForeignKey(Product, on_delete=models.SET_NULL, related_name='stdacc_for', null=True)
    quantity = models.IntegerField()

    def __str__(self):
        return f'{self.parent.name} includes {self.quantity} x {self.accessory.name}'


class Description(AdminAuditTrail):
    last_updated = models.DateTimeField(auto_now=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='descriptions')
    language = models.CharField(max_length=2, choices=SUPPORTED_LANGUAGES)
    description = models.CharField(max_length=DOCS_ONE_LINER)

    def __str__(self):
        return f'[{self.language}, {self.product.part_number}] {self.product.name}, {self.last_updated - datetime.timedelta(microseconds=self.last_updated.microsecond)}'

class PriceList(AdminAuditTrail):
    valid_from = models.DateField()
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)

    def __str__(self):
        return self.name

class ResaleCategory(AdminAuditTrail):
    """ Standard resale discount rates by category """
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    resale_perc = models.FloatField()

    def __str__(self):
        return self.name

class Price(models.Model):
    price_list = models.ForeignKey(PriceList, on_delete=models.CASCADE, related_name = 'prices')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='list_prices')
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    def value_f(self):
        return format_money(self.value)

    def __str__(self):
        return f'{self.price_list.name} {self.product.name} @ {self.currency} {self.value}'

class AgentResaleGroup(AdminAuditTrail):
    """ Agent-specific resale discount group """
    agent = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='resale_prices')
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    percentage = models.FloatField()

    def __str__(self):
        return f'{self.agent}, {self.name}'


















# Support for modular ordering
class SlotChoiceList(models.Model):
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    choices = models.ManyToManyField(Product, related_name='in_slot_lists')

    def __str__(self):
        return self.name

class Slot(models.Model):
    parent = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='slots')
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)

    quantity_required = models.IntegerField()
    quantity_optional = models.IntegerField()
    choice_group = models.ForeignKey(SlotChoiceList, on_delete=SET_NULL, related_name='used_by', null=True)

    def choice_list(self):
        return self.choice_group.choices.all()

    def valid_jobitems(self, parent):
        sibling_jobitems = JobItem.objects.filter(job=parent.job).exclude(id=parent.id).filter(included_with=None)
        slot_eligible_siblings = sibling_jobitems.filter(product__id__in=self.choice_group.choices.all())
        return slot_eligible_siblings

    def __str__(self):
        return f'[{self.quantity_required} REQ, {self.quantity_optional} opt] {self.name} for {self.parent.name}'












# PO-specific stuff
# PO
class PurchaseOrder(AdminAuditTrail):
    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='po')
    reference = models.CharField(max_length=PO_NAME_LENGTH)
    date_on_po = models.DateField()
    date_received = models.DateField()
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)
    active = models.BooleanField(default=True)

    def value_f(self):
        return format_money(self.value)

    def __str__(self):
        return f'{self.reference} from {self.job.invoice_to.site.company.name}'

#Job stuff
class Job(AdminAuditTrail):
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

    def get_comment_page_data(self, user, setting_for_order_by):
        comment_page_data = []

        todo_dict = {}
        todo_dict['type'] = 'section'
        todo_dict['need_close'] = False
        todo_dict['title'] = 'Todo List Display'
        comment_page_data.append(todo_dict)

        all_todo_comments = self.get_all_todo_comments(user, setting_for_order_by)
        if len(all_todo_comments) == 0:
            comment_page_data.append(get_empty_comment_section_dict('No comments displayed on todo list'))
        else:
            comment_page_data += all_todo_comments

        pinned_dict = {}
        pinned_dict['type'] = 'section'
        pinned_dict['need_close'] = True
        pinned_dict['title'] = 'Pinned'
        comment_page_data.append(pinned_dict)

        all_pinned_comments = self.get_all_pinned_comments(user, setting_for_order_by)
        if len(all_pinned_comments) == 0:
            comment_page_data.append(get_empty_comment_section_dict('No comments have been pinned'))
        else:
            comment_page_data += all_pinned_comments

        all_dict = {}
        all_dict['type'] = 'section'
        all_dict['need_close'] = True
        all_dict['title'] = 'All'
        comment_page_data.append(all_dict)

        all_comments = self.get_all_comments(user, setting_for_order_by)
        if len(all_comments) == 0:
            comment_page_data.append(get_empty_comment_section_dict('No comments have been added'))
        else:
            comment_page_data += all_comments

        return comment_page_data


    def get_all_comments(self, user, setting_for_order_by):
        all_comments = JobComment.objects.filter(job=self).filter(Q(created_by=user) | Q(private=False)).order_by(setting_for_order_by)
        result = []
        for c in all_comments:
            result.append(c.get_display_dict(user))

        return result

    def get_all_pinned_comments(self, user, setting_for_order_by):
        all_comments = JobComment.objects.filter(job=self).filter(Q(created_by=user) | Q(private=False)).order_by(setting_for_order_by)
        result = []
        for c in all_comments:
            if c.pinned_by(user):
                result.append(c.get_display_dict(user))
        return result

    def get_all_todo_comments(self, user, setting_for_order_by):
        all_comments = JobComment.objects.filter(job=self).filter(Q(created_by=user) | Q(private=False)).order_by(setting_for_order_by)
        result = []
        for c in all_comments:
            if c.on_todo_list(user):
                result.append(c.get_display_dict(user))
        return result        


    def on_todo_list(self, user):
        return self in user.todo_list_jobs.all()

    def admin_warnings(self):
        result = {}

        result['strings'] = []
        if not self.price_is_ok:
            result['strings'].append('Price unconfirmed'.upper())
        
        if self.total_difference_value_po_vs_line() != 0:
            result['strings'].append('Price discrepancy (PO vs. line items)')

        if self.items.count() == 0:
            result['strings'].append('No items added')

        if self.modules_are_missing():
            result['strings'].append('Modular items incomplete')
        
        result['tuples'] = []
        qs = self.related_po()
        if qs.count() == 0:
            result['tuples'].append(('PO', 'none'))


        result['tuples'] += self.get_document_warnings()

        return result


    def modules_are_missing(self):
        main_items = self.main_item_list()
        if main_items == None:
            return False
    
        for ji in main_items:
            if not ji.all_required_modules_assigned():
                return True
        return False


    def get_document_warnings(self):
        result = []
        for loop_tuple in DOCUMENT_TYPES:
            doc_type = loop_tuple[0]

            default_incl_items = self.get_default_included_items(doc_type)
            if len(default_incl_items) > 0 if default_incl_items != None else False:
                result.append((doc_type, 'items unassigned'))

            if self.unissued_documents_exist(doc_type):
                result.append((doc_type, 'documents unissued'))

        return result



    def unissued_documents_exist(self, doc_type):
        try:
            qs = self.related_documents()
            dvs = qs.filter(document__doc_type=doc_type)
        except DocumentVersion.DoesNotExist:
            return False

        return dvs.filter(issue_date = None).count() > 0


    def price_changed(self):
        if self.price_is_ok:
            self.price_is_ok = False
            self.save()

    def total_value(self):
        # Change this to whatever is going to be the "main" value for the order
        return self.total_po_value()

    def total_value_f(self):
        return format_money(self.total_value())


    def total_list_price(self):
        try:
            return sum([item.list_price() for item in self.items.filter(included_with=None)])
        except:
            return 0

    def total_list_price_f(self):
        return format_money(self.total_list_price())


    def total_line_value(self):
        order_value = self.items.aggregate(order_value=Sum('selling_price'))['order_value']
        if order_value == None:
            return 0
        else:
            return order_value

    def total_line_value_f(self):
        return format_money(self.total_line_value())


    def total_po_value(self):
        try:
            return sum([po.value for po in self.po.all()])
        except:
            return 0

    def total_po_value_f(self):
        return format_money(self.total_po_value())



    def total_difference_value_po_vs_line(self):
        return self.total_po_value() - self.total_line_value()

    def total_difference_value_line_vs_list(self):
        return self.total_line_value() - self.total_list_price()



    def total_resale_price_f(self):
        return format_money(sum([item.resale_price() for item in self.items.all()]))

    def total_list_difference_value_f(self):
        return format_money(self.total_difference_value_line_vs_list())

    def total_list_difference_perc(self):
        if self.total_list_price() == 0 or self.total_list_price() == None:
            return 0
        return round( self.total_difference_value_line_vs_list() / self.total_list_price() * 100, 2)

    def total_po_difference_value_f(self):
        return format_money(self.total_difference_value_po_vs_line())

    def total_po_difference_perc(self):
        if self.total_po_value() == 0 or self.total_po_value() == None:
            return 0
        return round( self.total_difference_value_po_vs_line() / self.total_po_value() * 100 , 2)

    def main_item_list(self):
        # List of only the JobItems which were entered by the user (i.e. excluding stdAccs)
        item_list = JobItem.objects.filter(job=self).filter(included_with=None)
        if item_list.count() == 0:
            return None
        return item_list

    def related_documents(self):
        qs = DocumentVersion.objects.filter(document__job=self).filter(active=True)
        return qs.order_by('issue_date').order_by('document__doc_type')

    def related_po(self):
        return PurchaseOrder.objects.filter(job=self).filter(active=True).order_by('date_received')


    # Document stuff
    def get_default_included_items(self, doc_type):
        # List of items assigned to this Job which have not yet been assigned to a document of this type.
        # On a new document, the assumption is that the user is creating the new document to cover the leftover items, so this is used to populate the default "included" list.
        # On an existing document, the user has already indicated which items they wish to include, so this is used to populate the top of the "excluded" list.
        result = get_document_available_items(self.main_item_list(), doc_type)
        return result

    def get_default_excluded_items(self, doc_type):
        # List of items already assigned to another document of the type in the argument.
        # Used to populate the "excluded" list when displaying a blank form for creating a new document.
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
    contents = models.TextField()
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='comments')
    private = models.BooleanField(default=True)
    todo_list_display = models.ManyToManyField(User, related_name='todo_list_comments')
    pinned = models.ManyToManyField(User, related_name='pinned_comments')

    def on_todo_list(self, user):
        return user in self.todo_list_display.all()

    def is_pinned_by(self, user):
        return user in self.pinned.all()

    def get_display_dict(self, user):
        result = {}
        result['type'] = 'comment'
        result['id'] = self.id
        result['created_by'] = self.created_by.username if self.created_by != user else 'You'
        result['created_on'] = self.created_on
        result['contents'] = self.contents
        result['private'] = self.private
        result['todo'] = self.on_todo_list(user)
        result['pinned'] = self.is_pinned_by(user)

        return result



    def __str__(self):
        return f'{self.created_by} on Job {self.job.name} @ {self.created_on}: "{self.contents[:15]}..."'









class JobItem(AdminAuditTrail):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='items')

    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True)
    price_list = models.ForeignKey(PriceList, on_delete=models.PROTECT, null=True)

    quantity = models.IntegerField(blank=True)
    selling_price = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    # Support for "nested" Products. e.g. a Pez dispenser includes one "free" packet of Pez; you also sell additional packets of Pez separately;
    # customer has ordered one dispenser and 3 spare packets. There would be two JobItem records: one to cover the packet included with the dispenser
    # (where "included_with" would refer to the JobItem for the dispenser) and one to cover the three spares (where "included_with" would be blank).
    included_with = models.ForeignKey('self', on_delete=models.CASCADE, related_name='includes', null=True, blank=True)

    def display_str(self):
        return f'{self.quantity} x [{self.product.part_number}] {self.product.name}'

    def display_str_with_money(self):
        return f'{self.display_str()} @ {self.job.currency}&nbsp;{self.selling_price_f()}'

# Modular JobItems, non slot-specific
    def num_unassigned(self):
        # For child JobItems. Are any "left" to assign to other slots?
        assignments = self.module_of.all()
        if assignments.count() == 0:
            return self.quantity
        return self.quantity - assignments.aggregate(Sum('quantity'))['quantity__sum']

    def all_required_modules_assigned(self):
        # For parent JobItems. Is this a functional spec, with all required filled?
        if self.product.is_modular():
            for slot in self.product.slots.all():
                if self.num_assigned(slot) < slot.quantity_required:
                    return False
        return True

    def all_optional_modules_assigned(self):
        # For parent JobItems. Offer the user more spots?
        if self.product.is_modular():
            for slot in self.product.slots.all():
                if self.num_assigned(slot) < slot.quantity_required + slot.quantity_optional:
                    return False                
        return True

    def excess_modules_assigned(self):
        # For parent JobItems. Display a warning that this is a non-standard spec? 
        if self.product.is_modular():
            for slot in self.product.slots.all():
                if self.num_assigned(slot) > slot.quantity_required + slot.quantity_optional:
                    return True          
        return False   


# Modular JobItems, slot-specific
    def num_assigned(self, slot):
        # Parent JobItems. Use to find out qty of children assigned to a particular slot.
        assignments = JobModule.objects.filter(parent=self).filter(slot=slot)
        if assignments.count() == 0:
            qty_assigned = 0
        else:
            qty_assigned = assignments.aggregate(Sum('quantity'))['quantity__sum']
        return qty_assigned

    def remaining_slot_elements(self, slot):
        # Use when displaying the + Slot button on the module management page
        total_qty = slot.quantity_required + slot.quantity_optional
        qty_assigned = self.num_assigned(slot)
        spots_left = total_qty - qty_assigned
        return min(spots_left, slot.quantity_optional)

    def num_empty_spaces(self, slot):
        # This is used in the max_quantity GET call. If I remove that, I can also remove this.
        total_qty = slot.quantity_required + slot.quantity_optional
        qty_assigned = self.num_assigned(slot)
        return total_qty - qty_assigned

    def get_slot_details_string_required(self, slot):
        # Get the "1/3" string for displaying the slot status for required slots
        if self.product.is_modular():
            num_assignments = self.num_assigned(slot)
            if num_assignments <= slot.quantity_required:
                result = num_assignments
            else:
                result = slot.quantity_required
            return f'{result}/{slot.quantity_required}'
        return ''

    def get_slot_details_string_optional(self, slot):
        # Get the "1/3" string for displaying the slot status for optional slots
        if self.product.is_modular():
            num_assignments = self.num_assigned(slot)    

            if num_assignments <= slot.quantity_required:
                result = 0
            elif num_assignments <= slot.quantity_required + slot.quantity_optional:
                result = num_assignments - slot.quantity_required
            else:
                result = slot.quantity_optional
            return f'{result}/{slot.quantity_optional}'
        return ''
    
    def get_num_excess(self, slot):
        # Get the number of excess assignments to this slot
        if self.product.is_modular():
            num_assignments = self.num_assigned(slot)  
            if num_assignments <= slot.quantity_required + slot.quantity_optional:
                return 0
            else:
                return num_assignments - slot.quantity_required - slot.quantity_optional
        return 0


    def get_slot_status_dictionary(self, slot):
        return {
            'jobitem_has_excess': self.excess_modules_assigned(),
            'slot_num_excess': self.get_num_excess(slot),
            'required_str': self.get_slot_details_string_required(slot),
            'optional_str': self.get_slot_details_string_optional(slot)
        }

    def get_post_edit_dictionary(self):
        return {
            'part_number': self.product.part_number,
            'name': self.product.name,
            'quantity': self.quantity,
            'currency': self.job.currency,
            'selling_price': self.selling_price,
            'selling_price_f': self.selling_price_f(),
            'price_list': self.price_list.name,
            'list_price_f': self.list_price_f(),
            'list_difference_value_f': self.list_difference_value_f(),
            'list_difference_perc_f': self.list_difference_perc_f(),
            'resale_price_f': self.resale_price_f(),
            'resale_percentage': str(self.resale_percentage()),
            'resale_difference_value_f': self.resale_difference_value_f(),
            'resale_difference_perc_f': self.resale_difference_perc_f(),
            'total_sold_f': self.job.total_value_f(),
            'total_list_f': self.job.total_list_price_f(),
            'total_list_difference_value_f': self.job.total_list_difference_value_f(),
            'total_list_difference_perc': str(self.job.total_list_difference_perc()),
            'total_po_f': self.job.total_po_value_f(),
            'total_po_difference_value': self.job.total_difference_value_po_vs_line(),
            'total_po_difference_value_f': self.job.total_po_difference_value_f(),
            'total_po_difference_perc': self.job.total_po_difference_perc(),
            'stdAccs': [stdAcc.serialise_stdAcc() for stdAcc in self.includes.all()]
        }

    def serialise_stdAcc(self):
        return {
            'quantity': self.quantity,
            'name': str(self.product)
        }


    def add_standard_accessories(self):
        # Suppose the Thingummy product includes 3 x Widgets. Someone orders 2 x Thingummies. The system will store:
        #   > JobItem record for 2 x Thingummy
        #   > JobItem record for 6 x Widgets

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
        stdAccs = self.includes.all()
        if stdAccs.count() > 0:
            stdAccs.delete()
        self.add_standard_accessories()

    def update_standard_accessories_quantities(self):
        for stdAcc in self.includes.all():
            qty_per_parent = StandardAccessory.objects.filter(parent=self.product).filter(accessory=stdAcc.product)['quantity']
            if qty_per_parent == None:
                qty_per_parent = 0
            stdAcc.quantity = self.quantity * qty_per_parent
            stdAcc.save()

 

    def selling_price_f(self):
        return format_money(self.selling_price)

    def inv_description(self):
        if self.invoice_wording != None:
            return self.invoice_wording.description
        elif self.description != '':
            return self.description
        else:
            try:
                self.product.get_description(self.job.language)
            except:
                return "Words can't describe it."
    
    def inv_part_number(self):
        if self.invoice_wording != None:
            return self.invoice_wording.part_number
        elif self.product != '':
            return self.product.part_number
        else:
            return '-'
    
    def resale_percentage(self):
        # Resale discount will apply. Check if the agent has negotiated a special deal on this item.
        if not self.job.invoice_to.site.company.is_agent:
            return 0
        else:
            if self.product.resale_category == None and self.product.special_resale.all().count() == 0:
                return 0

            deal = self.product.special_resale.filter(agent=self.job.invoice_to.site.company)
            if len(deal) != 0:
                # There's a special deal, so use the special deal percentage
                return deal[0].percentage
            else:
                # No special arrangements, so use the standard percentage
                return self.product.resale_category.resale_perc

    def list_price(self):
        return self.quantity * Price.objects.filter(currency=self.job.currency).filter(price_list=self.price_list).get(product=self.product).value

    def list_price_f(self):
        return format_money(self.list_price())

    def resale_price(self):
        """ Get current list price, in the Job currency, less resale discount """
        # Apply percentage to list price
        resale_multiplier = 1 - (self.resale_percentage() / 100)
        value = float(self.list_price()) * float(resale_multiplier)
        return round(value, 2)

    def resale_price_f(self):
        return format_money(self.resale_price())

    def list_difference_value_f(self):
        diff = self.selling_price - self.list_price()
        return get_plusminus_prefix(diff) + format_money(diff)

    def resale_difference_value_f(self):
        diff = float(self.selling_price) - self.resale_price()
        return get_plusminus_prefix(diff) + format_money(diff)

    def list_difference_perc(self):
        if self.selling_price == 0 or self.selling_price == None:
            return 0
        return round((self.selling_price - self.list_price())/self.selling_price*100, 2)

    def list_difference_perc_f(self):
        return get_plusminus_prefix(self.list_difference_perc()) + format_money(self.list_difference_perc())

    def resale_difference_perc(self):
        if self.selling_price == 0 or self.selling_price == None:
            return 0
        return round((float(self.selling_price) - self.resale_price())/float(self.selling_price)*100, 2)

    def resale_difference_perc_f(self):
        return get_plusminus_prefix(self.resale_difference_perc()) + format_money(self.resale_difference_perc())

    def __str__(self):
        return f'({self.job.name}) {self.quantity} x {self.product.name}'




class JobModule(models.Model):
    parent = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='modules')
    child = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='module_of', null=True, blank=True)
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name='usages')
    quantity = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.parent.product.name}'s {self.slot.name} slot filled by {self.child.product.name}"














# class ProdGroup(AdminAuditTrail):
#     date_wanted = models.DateTimeField()
#     date_scheduled = models.DateTimeField(blank=True)
#     job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='batches')
#     name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
#     items = models.ManyToManyField(JobItem, related_name='prod_groups', through='ItemPrAssignment')

#     def __str__(self):
#         return '(' + self.job.name + ') ' + self.name

# I don't think I need this anymore.
# class ItemPrAssignment(models.Model):
#     group = models.ForeignKey(ProdGroup, on_delete=models.CASCADE, related_name='assigned')
#     item = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='assignments')
#     quantity = models.IntegerField()

#     def __str__(self):
#         return f'{self.group.name} <<< {self.quantity} from ({self.item.job.name}) {self.item.quantity} x {self.item.product.name}'


# class ProdDetails(AdminAuditTrail):
#     """ 
#         Details which arise during/after production and apply to MULTIPLE instances of the same product.
#         (e.g. "5 widgets from $JOB finished on $DATE")
        
#         Note: This record would be created for every completed JobItem.
#     """
#     item = models.ForeignKey(JobItem, on_delete=models.PROTECT, related_name = 'details')
#     quantity = models.IntegerField(blank=True)
#     date_finished = models.DateField(blank=True)

#     def __str__(self):
#         return f'{self.quantity} x ({self.item.job.name}) {self.item.quantity} x {self.item.product.name}, completed on {self.date_finished}'


# class SpecificDetails(AdminAuditTrail):
#     """ 
#         Details which arise during/after production and apply to a SINGLE instance of a product.
#         (e.g. serial numbers)

#         Note: Only created when unique data exists for specific instances of a product.

#         Notes about usage:
#             Case: JobItem quantity = 3 and Product id_type is "per item".
#             Expectation: 1 x ProdDetails record showing quantity = 3; 3 x SpecificDetails records, each containing a serial number for a specific item.

#             Case: JobItem quantity = 150 and Product id_type is "per batch". All products supplied are from the same batch.
#             Expectation: 1 x ProdDetails record showing quantity = 150; 1 x SpecificDetails record shows the batch serial number.

#             Case: JobItem quantity = 150 and Product id_type is "per batch". 100 will be supplied from Batch A and 50 from Batch B.
#             Expectation: 2 x ProdDetails records, one showing a quantity of 100 and one showing a quantity of 50; 2 x SpecificDetails, one showing 
#             Batch A's serial number and linking to the 100; one showing Batch B's serial number and linking to the 50.
#     """
#     prod_details = models.ForeignKey(ProdDetails, on_delete=models.PROTECT, related_name = 'specifics', null=True)
#     reference = models.CharField(max_length=LENGTH_SERIAL_NUMBER)
    
#     # If multiple items supplied together all have SNs, optionally store the links.
#     supplied_with = models.ManyToManyField('self')

#     def __str__(self):
#         return f'Item {self.reference}'


# # Finance support
# class FinGroup(AdminAuditTrail):
#     """ Group job content for a financial document (= invoice or credit note) """
#     job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name='fin_groups')
#     reference = models.CharField(max_length=10, blank=True)

#     name = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
#     #recipient = models.ForeignKey(Site, on_delete=models.PROTECT, related_name='financials') # commented out because isn't this what invoice_to is for?
#     currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
#     value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

#     show_item_discounts = models.BooleanField(default=True)

#     def __str__(self):
#         if self.name == '':
#             show_name = 'Unnamed'
#         else:
#             show_name = self.name
#         return show_name + ' for ' + self.job.name


# class DisplayLineItem(AdminAuditTrail):
#     """ Abstract class to store 'dummy' body text / line-items for documents """
#     quantity = models.CharField(max_length=7, blank=True)
#     part_number = models.CharField(max_length=PART_NUM_LENGTH, blank=True)
#     description = models.CharField(max_length=DOCS_ONE_LINER, blank=True)
#     # Note: no value fields because any changes to values must occur via JobItems, so they can be recorded in the system

#     class Meta:
#         abstract = True

# class FinDisplayGroup(DisplayLineItem):
#     """ Group JobItems for display purposes within the financial document, applying display settings """   
#     group = models.ForeignKey(FinGroup, on_delete=models.CASCADE, related_name='subgroups')
#     name = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)

#     # Settings for the group
#     show_description = models.BooleanField(default=False)
#     show_details = models.BooleanField(default=True)
#     show_subtotal = models.BooleanField(default=False)

#     def display_desc(self):
#         if self.description == '':
#             return self.name
#         else:
#             return self.description

#     def __str__(self):
#         return f'{self.group.name}: {self.name}'

# class InvoiceExtraLine(DisplayLineItem):
#     """ If the invoice needs some notes at the end, add them using this """
#     display_group = models.ForeignKey(FinDisplayGroup, on_delete=models.SET_NULL, related_name='extra_lines', null=True)
    
#     def __str__(self):
#         return f'Line added to {self.display_group.name}: {self.display_desc()}'

# class InvoiceWording(DisplayLineItem):
#     """ If the customer needs their own descriptions / part numbers to appear on line items, store them here """
#     item = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='invoice_wording')

#     def __str__(self):
#         return f'Override ({self.item.job.name}) {self.item.quantity} x {self.item.product.name} text'





class AccEventOE(AdminAuditTrail):
    """ Store data about a single change to OE, whether it's a new order or a modification to an existing order """
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)
    reason = models.TextField(blank=True)
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name='oe_events')
    po = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name='oe_adjustments', blank=True, null=True)

    def __str__(self):
        return f'{get_plusminus_prefix(self.value)}{format_money(self.value)} {self.currency}. Job {self.job.name} @ {self.created_on.strftime("%Y-%m-%d %H:%M:%S")}'





class DocumentData(models.Model):
    reference = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    doc_type = models.CharField(max_length=DOC_CODE_MAX_LENGTH, choices=DOCUMENT_TYPES, null=True)
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name='documents')

    def previous_versions(self):
        try:
            return DocumentVersion.objects.filter(document=self).filter(active=False).order_by('created_on')
        except:
            return None

    def __str__(self):
        return f'{self.doc_type} {self.reference}'


class DocumentVersion(AdminAuditTrail):
    document = models.ForeignKey(DocumentData, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    issue_date = models.DateField(null=True, blank=True)

    # This should be set to False in two situations: version is deleted; version is replaced
    active = models.BooleanField(default=True)

    # Suppose a customer places an order, then moves premises prior to delivery. The Job record should be updated with their new address,
    # but documents which have already been issued should preserve the address as it was when they were issued.
    # These two fields are intended for that purpose. PROTECT because this could touch on financial documents: don't want to mess with those.
    invoice_to = models.ForeignKey(Address, on_delete=models.PROTECT, null=True, blank=True, related_name='financial_documents')
    delivery_to = models.ForeignKey(Address, on_delete=models.PROTECT, null=True, blank=True, related_name='delivery_documents')

    items = models.ManyToManyField(JobItem, related_name='on_documents', through='DocAssignment')

    def get_display_data_dict(self):
        data = {}
        data['fields'] = self.get_doc_fields(self.document.doc_type)

        data['title'] = dict(DOCUMENT_TYPES).get(self.document.doc_type)

        if self.issue_date != '' and self.issue_date != None:
            data['mode'] = 'issued'
            data['css_file'] = 'adminas/document_final.css'
        else:
            data['mode'] = 'preview'
            data['css_file'] = 'adminas/document_preview.css'

        data['job_id'] = self.document.job.id
        data['version_id'] = self.id
        data['job_id'] = self.document.job.id

        data['currency'] = self.document.job.currency
        data['total_value_f'] = self.total_value_f()

        data['invoice_to'] = self.invoice_to.display_str_newlines()
        data['delivery_to'] = self.delivery_to.display_str_newlines()
        
        data['issue_date'] = self.issue_date if self.issue_date != '' else None
        data['created_by'] = self.created_by
        
        data['instructions'] = []
        for instr in self.instructions.all():
            data['instructions'].append(instr.instruction)
        
        data['line_items'] = self.get_body_lines()
        data['empty_row_range'] = range(1, len(data['line_items']) % MAX_ROWS_OC)
                 
        return data      


    def get_doc_fields(self, doc_type):
        # Many documents contain a section which lists a bunch of label/value pairs, where every item has the same formatting.
        # "Fields" is for storing all those in a list so that in the template you can setup a loop for "field in fields" and be done with it.
        fields = []

        # Add Issue Date
        fields.append({
            'h': 'Issue Date',
            'body': self.issue_date
        })

        # Add document reference (with conditional label text)
        reference_label = 'Reference No.'
        if doc_type == 'OC':
            reference_label = 'Confirmation No.'
        fields.append({
            'h': reference_label,
            'body': self.document.reference
        })

        # Add purchase order info.
        # While most documents will relate to a single PO, some customers prefer to make modifications via additional PO/s rather than amending the first,
        # so this must also support making a list of POs.
        
        try:
            str = f'{self.document.job.po.all()[0].reference} dated {self.document.job.po.all()[0].date_on_po}'
            for po in self.document.job.po.all()[1:]:
                str += f', {po.reference} dated {po.date_on_po}'
        except PurchaseOrder.DoesNotExist:
            str = 'N/A'

        fields.append({
            'h': 'PO No.',
            'body': str
        })

        # Add estimated production date.
        try:
            prod_data = ProductionData.objects.filter(version=self)[0]
            date_sched = prod_data.date_scheduled
        except ProductionData.DoesNotExist:
            date_sched = 'TBC'
        fields.append({
            'h': 'Estimated Date',
            'body': date_sched
        })

        # Add list of origin countries' full names, but only when needed
        if doc_type == 'OC':
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



    def deactivate(self):
        self.active = False
        self.save()

    def reactivate(self):
        self.active = True
        self.save()

    def get_replacement_version(self, user):
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
        previous = DocumentVersion.objects.filter(document=self.document).filter(version_number=self.version_number - 1).order_by('-created_on')[0]

        # Deactivate self to "free up" all assigned items before testing for a clash (otherwise if the item list hasn't changed, previous will clash with its future self)
        self.deactivate()
        if previous.item_assignments_clash(self):
            # If it clashes anyway, reactivate self and abort the revert
            self.reactivate()
            return None
        else:
            previous.reactivate()
            return previous



    def item_assignments_clash(self):
        # Part of the "revert to previous version" process
        # Suppose a user: issued WO #A v1, including 1/1 of Item #X; created WO #A v2 in which 1/1 of Item #X is removed; created WO #B v1, including 1/1 of Item #X;
        # tries to revert WO #A to v1.
        # To avoid 1/1 of Item #X appearing in two places, reverting WO #A to v1 is forbidden until 1/1 Item #X no longer appears on WO #B.
        # This is where we check if any of the possible "Item #Xs" on this WO already appear elsewhere.

        for assignment in DocAssignment.objects.filter(version=self):
            if assignment.quantity > assignment.max_quantity_excl_self():
                return True

        return False
       


    def get_included_items(self):
        # List of items assigned to this particular document.
        # Use for populating the "included" list in the builder page.
        if self.items.all().count() == 0:
            return None

        else:
            assignments = DocAssignment.objects.filter(version=self)
            result = []
            for a in assignments:
                this_dict = {}
                this_dict['id'] = a.pk
                this_dict['jiid'] = a.item.pk
                this_dict['display'] = a.item.display_str().replace(str(a.item.quantity), str(a.quantity))
                result.append(this_dict)
            return result


    def get_excluded_items(self):
        available = self.get_available_items()
        unavailable = self.get_unavailable_items()
        if available == None or self.id == None:
            return unavailable
        elif unavailable == None:
            return available
        else:
            return available + unavailable


    def get_body_lines(self):
        # List of items assigned to this particular document.
        if self.items.all().count() == 0:
            return None
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
                result.append(main_item)

                if a.item.includes.all().count() != 0:
                    std_acc_intro = {}
                    std_acc_intro['product_description'] = 'which includes the following:'
                    result.append(std_acc_intro)

                    for std_acc in a.item.includes.all():
                        std_acc_dict = {}
                        std_acc_dict['product_description'] = std_acc.display_str()
                        result.append(std_acc_dict)

            return result


    def get_available_items(self):
        # List of items assigned to this Job which have not yet been assigned to a document of this type.
        # On a new document, the assumption is that the user is creating the new document to cover the leftover items, so this is used to populate the default "included" list.
        # On an existing document, the user has already indicated which items they wish to include, so this is used to populate the top of the "excluded" list.
        return get_document_available_items(self.document.job.main_item_list(), self.document.doc_type)


    def get_unavailable_items(self):
        # List of items already assigned to another document of this type.
        # Used to populate the "excluded" list.
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
            this_dict['display'] = ae.item.display_str().replace(str(ae.item.quantity), str(ae.quantity))
            this_dict['is_available'] = False
            this_dict['used_by'] = ae.version.document.reference
            this_dict['doc_id'] = ae.version.id
            result.append(this_dict)                
        return result


    def update_item_assignments_and_get_create_list(self, required):
        # required = a list of dicts with two fields, JobItem id and quantity, which reflects the desired end state for DocAssignment records.
        # Here we compare "required" to existing DocAssignments and handle cases of update, "no change" and delete.
        # Creating new DocAssignments will be handled elsewhere, so return a list of everything that doesn't already have a record.
        for ea in DocAssignment.objects.filter(version=self):
            found = False
            for req in required:
                if 'id' in req and int(req['id']) == ea.item.id:
                    # Case = UPDATE: assignment already exists. Update the quantity, if necessary, then check this off the to-do list.
                    found = True
                    if int(req['quantity']) != ea.quantity:
                        ea.quantity = min(int(req['quantity']), ea.max_quantity_incl_self())
                        ea.save()
                    required.remove(req)
                    break
            if not found:
                # Case = DELETE: existing assignment doesn't appear in the required list.
                ea.delete()
        return required


    def update_special_instructions_and_get_create_list(self, required):
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


    def update_requested_production_date(self, prod_data_form):
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
        return sum(item['total_price'] for item in self.get_body_lines() if 'total_price' in item)

    def total_value_f(self):
        return format_money(self.total_value())

    def __str__(self):
        return f'{self.document.doc_type} {self.document.reference} v{self.version_number} dated {self.issue_date}'


class DocAssignment(models.Model):
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE)
    item = models.ForeignKey(JobItem, on_delete=models.CASCADE)
    quantity = models.IntegerField()

    def max_quantity_incl_self(self):
        return self.max_quantity_excl_self() + self.quantity

    def max_quantity_excl_self(self):
        total = self.item.quantity
        qty_assigned = DocAssignment.objects\
                    .filter(item=self.item)\
                    .filter(version__document__doc_type=self.version.document.doc_type)\
                    .filter(version__active=True)\
                    .aggregate(Sum('quantity'))['quantity__sum']

        if qty_assigned == None:
            qty_assigned = 0

        return total - qty_assigned

    def __str__(self):
        return f'{self.quantity} x {self.item.product.name} assigned to {self.version.document.doc_type} {self.version.document.reference}'


class ProductionData(models.Model):
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name='production_data')
    date_requested = models.DateField(blank=True, null=True)
    date_scheduled = models.DateField(blank=True, null=True)

    def __str__(self):
        return f'Production of {self.version.document.doc_type} {self.version.document.reference}. Req = {self.date_requested}, Sch = {self.date_scheduled}'

class SpecialInstruction(AdminAuditTrail):
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name='instructions')
    instruction = models.TextField(blank=True)

    def __str__(self):
        return f'Note on {self.version.document.doc_type} {self.version.document.reference} by {self.created_by.name} on {self.created_on}'


