from django.core.exceptions import NON_FIELD_ERRORS
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.deletion import SET_NULL
from django.db.models.fields import CharField
from django.db.models import Sum

from django_countries.fields import CountryField

from decimal import Decimal
from adminas.constants import SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, DEFAULT_LANG, INCOTERMS, UID_CODE_LENGTH, UID_OPTIONS
from adminas.util import format_money, get_plusminus_prefix
import datetime

# Size fields
JOB_NAME_LENGTH = 8 # YYMM-NNN
PART_NUM_LENGTH = 10
DOCS_ONE_LINER = 300 # <- placeholder value until I check how many 'M's and how many 'i's fit on a single line, then pick something sorta in the middle
SYSTEM_NAME_LENGTH = 50
LENGTH_SERIAL_NUMBER = 6
MAX_DIGITS_PRICE = 15
F_PRICE_LENGTH = MAX_DIGITS_PRICE + 1 + (MAX_DIGITS_PRICE / 3) # <- + 1 for the decimal symbol; MAX/3 as a rough approximation for the thousands separator

COMPANY_NAME_LENGTH = 100
REGION_NAME_LENGTH = 100
PO_NAME_LENGTH = 50
PERSON_NAME_LENGTH = 100


class User(AbstractUser):
    pass

class AdminAuditTrail(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='%(class)s_added', null=True)

    class Meta:
        abstract = True

# "System data" tables. That is, stuff that should already be in place when you begin processing a PO

# Customers and partners
from django.db.models import Q
from django.db.models import F
from django.db.models import Count
from itertools import chain

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
        return Slot.objects.filter(parent=self).count() > 0

    def __str__(self):
        return self.part_number + ': ' + self.name


class StandardAccessory(AdminAuditTrail):
    parent = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='my_stdaccs')
    accessory = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stdacc_for')
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

    def total_value(self):
        order_value = self.items.aggregate(order_value=Sum('selling_price'))['order_value']
        if order_value == None:
            return 0
        else:
            return order_value

    def total_value_f(self):
        return format_money(self.total_value())

    def total_list_price(self):
        try:
            return sum([item.list_price() for item in self.items.filter(included_with=None)])
        except:
            return 0

    def total_list_price_f(self):
        return format_money(self.total_list_price())

    def total_resale_price_f(self):
        return format_money(sum([item.resale_price() for item in self.items.all()]))

    def total_list_diff_value(self):
        return self.total_value() - self.total_list_price()

    def total_list_diff_value_f(self):
        return format_money(self.total_list_diff_value())

    def total_list_diff_perc(self):
        if self.total_list_price() == 0 or self.total_list_price() == None:
            return 0
        return round( self.total_list_diff_value() / self.total_value() * 100, 2)

    def __str__(self):
        return f'{self.name} {self.created_on}'

class JobComment(AdminAuditTrail):
    contents = models.TextField()
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='comments')
    is_status = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.created_by} on Job {self.job.name}'

class JobItem(AdminAuditTrail):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='items')

    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True)
    price_list = models.ForeignKey(PriceList, on_delete=models.PROTECT, null=True)

    quantity = models.IntegerField(blank=True)
    selling_price = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    #description = models.CharField(max_length=DOCS_ONE_LINER, blank=True, null=True)
    #dummy_part_num = models.CharField(max_length=PART_NUM_LENGTH, blank=True)

    # Support for "nested" Products, e.g. Pez dispenser prices includes one packet of Pez; you also sell additional packets of Pez separately
    # The packet included with the dispenser would get its own JobItem where the dispenser JobItem would go in "included_with"
    included_with = models.ForeignKey('self', on_delete=models.CASCADE, related_name='includes', null=True, blank=True)
   
    def get_post_edit_dictionary(self):
        return {
            'list_price_f': self.list_price_f(),
            'list_difference_value_f': self.list_difference_value_f(),
            'list_difference_perc_f': self.list_difference_perc_f(),
            'resale_price_f': self.resale_price_f(),
            'resale_percentage': str(self.resale_percentage()),
            'resale_difference_value_f': self.resale_difference_value_f(),
            'resale_difference_perc_f': self.resale_difference_perc_f(),
            'total_sold_f': self.job.total_value_f(),
            'total_list_f': self.job.total_list_price_f(),
            'total_list_diff_val_f': self.job.total_list_diff_value_f(),
            'total_list_diff_perc': str(self.job.total_list_diff_perc()),
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


    def all_required_modules_assigned(self):
        if self.product.is_modular():
            return self.modules_assigned(True)
        else:
            return True

    def all_optional_modules_assigned(self):
        if self.product.is_modular():
            return self.modules_assigned(False)
        else:
            return True


    def modules_assigned(self, required):
        all_slots = self.product.slots.all()
        if required:
            slots = all_slots.filter(quantity_required__gt=0)
        else:
            slots = all_slots.filter(quantity_optional__gt=0)

        for slot in slots:
            if slot not in self.modules.all():
                return False
        return True
  

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
    child = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='module_of')
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name='usages')

    def __str__(self):
        return f'{self.slot.name} slot for {self.parent.product.name}'

class ProdGroup(AdminAuditTrail):
    date_wanted = models.DateTimeField()
    date_scheduled = models.DateTimeField(blank=True)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='batches')
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    items = models.ManyToManyField(JobItem, related_name='prod_groups', through='ItemPrAssignment')

    def __str__(self):
        return '(' + self.job.name + ') ' + self.name

class ItemPrAssignment(models.Model):
    group = models.ForeignKey(ProdGroup, on_delete=models.CASCADE, related_name='assigned')
    item = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='assignments')
    quantity = models.IntegerField()

    def __str__(self):
        return f'{self.group.name} <<< {self.quantity} from ({self.item.job.name}) {self.item.quantity} x {self.item.product.name}'


class ProdDetails(AdminAuditTrail):
    """ 
        Details which arise during/after production and apply to MULTIPLE instances of the same product.
        (e.g. "250 widgets from $JOB finished on $DATE")
        
        Note: This record is created for every completed JobItem.
    """
    item = models.ForeignKey(JobItem, on_delete=models.PROTECT, related_name = 'details')
    quantity = models.IntegerField(blank=True)
    date_finished = models.DateField(blank=True)

    def __str__(self):
        return f'{self.quantity} x ({self.item.job.name}) {self.item.quantity} x {self.item.product.name}, completed on {self.date_finished}'


class SpecificDetails(AdminAuditTrail):
    """ 
        Details which arise during/after production and apply to a SINGLE instance of a product.

        Note: This record is only created when unique data exists for specific instances of a product.

        Note: Definition of "an instance" is flexible. Suppose the product is sold by tens/hundreds/thousands at a time,
        but each set of 100 is a specific, traceable batch. You can consider the entire batch to be "an instance". If the program
        sees ProdDetails quantity = 500, a flag on the product for "MANY" on the serial number and a single SpecificDetails, it'll know what's up.

        Edge-case note: Suppose the JobItem is for 150 widgets, so you supply 100 from Batch A and 50 from Batch B.
        2 x SpecificDetails connecting "A" and "B" to a JobItem for 150 widgets would result in uncertainty over how many came from each batch.
        Best procedure = create 2 x ProdDetails, one for 100/A and one for 50/B.
    """
    prod_details = models.ForeignKey(ProdDetails, on_delete=models.PROTECT, related_name = 'specifics', null=True)
    reference = models.CharField(max_length=LENGTH_SERIAL_NUMBER)
    
    # If multiple items supplied together all have SNs, optionally store the links.
    supplied_with = models.ManyToManyField('self')

    def __str__(self):
        return f'Item {self.reference}'


# Finance support
class FinGroup(AdminAuditTrail):
    """ Group job content for a financial document (= invoice or credit note) """
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name='fin_groups')
    reference = models.CharField(max_length=10, blank=True)

    name = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    #recipient = models.ForeignKey(Site, on_delete=models.PROTECT, related_name='financials') # commented out because isn't this what invoice_to is for?
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    show_item_discounts = models.BooleanField(default=True)

    def __str__(self):
        if self.name == '':
            show_name = 'Unnamed'
        else:
            show_name = self.name
        return show_name + ' for ' + self.job.name


class DisplayLineItem(AdminAuditTrail):
    """ Abstract class to store 'dummy' body text / line-items for documents """
    quantity = models.CharField(max_length=7, blank=True)
    part_number = models.CharField(max_length=PART_NUM_LENGTH, blank=True)
    description = models.CharField(max_length=DOCS_ONE_LINER, blank=True)
    # Note: no value fields because any changes to values must occur via JobItems, so they can be recorded in the system

    class Meta:
        abstract = True

class FinDisplayGroup(DisplayLineItem):
    """ Group JobItems for display purposes within the financial document, applying display settings """   
    group = models.ForeignKey(FinGroup, on_delete=models.CASCADE, related_name='subgroups')
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)

    # Settings for the group
    show_description = models.BooleanField(default=False)
    show_details = models.BooleanField(default=True)
    show_subtotal = models.BooleanField(default=False)

    def display_desc(self):
        if self.description == '':
            return self.name
        else:
            return self.description

    def __str__(self):
        return f'{self.group.name}: {self.name}'

class InvoiceExtraLine(DisplayLineItem):
    """ If the invoice needs some notes at the end, add them using this """
    display_group = models.ForeignKey(FinDisplayGroup, on_delete=models.SET_NULL, related_name='extra_lines', null=True)
    
    def __str__(self):
        return f'Line added to {self.display_group.name}: {self.display_desc()}'

class InvoiceWording(DisplayLineItem):
    """ If the customer needs their own descriptions / part numbers to appear on line items, store them here """
    item = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='invoice_wording')

    def __str__(self):
        return f'Override ({self.item.job.name}) {self.item.quantity} x {self.item.product.name} text'




class AccountingEvent(AdminAuditTrail):
    """ Abstract class for the system's accounting data """
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)
    reason = models.TextField(blank=True)

    class Meta:
        abstract = True

class AccEventOE(AccountingEvent):
    """ Store data about a single change to OE, whether it's a new order or a modification to an existing order """
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name='oe_events')

    def __str__(self):
        return self.value + ' ' + self.currency + ', ' + self.job + ' @ ' + self.created_on

class AccEventTO(AccountingEvent):
    fin_group = models.ForeignKey(FinGroup, on_delete=models.PROTECT, related_name='to_events')

    def __str__(self):
        return self.value + ' ' + self.currency + ' ' + self.fin_group + ' @ ' + self.created_on




class DocumentData(AdminAuditTrail):
    invoice_to = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name='financial_documents')
    delivery_to = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_documents')
    # Store these independently in case the addresses change partway through the order.
    # The general idea is that Job.invoice_to and Job.delivery_to will contain the most recent, default addresses.
    pass
