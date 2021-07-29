from django.core.exceptions import NON_FIELD_ERRORS
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.deletion import SET_NULL

from django_countries.fields import CountryField

from decimal import Decimal
from .constants import SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, DEFAULT_LANG, INCOTERMS, UID_CODE_LENGTH, UID_OPTIONS
import datetime

# Size fields
JOB_NAME_LENGTH = 8 # YYMM-NNN
PART_NUM_LENGTH = 10
DOCS_ONE_LINER = 300 # <- placeholder value until I check how many 'M's and how many 'i's fit on a single line, then pick something sorta in the middle
SYSTEM_NAME_LENGTH = 50
LENGTH_SERIAL_NUMBER = 6
MAX_DIGITS_PRICE = 9
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

# Customers and partners
class Company(AdminAuditTrail):
    full_name = models.CharField(max_length=COMPANY_NAME_LENGTH)
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES, blank=True)

    is_agent = models.BooleanField(default=False)

    # Support for third-parties. When a user adds a new company solely to populate an address (delivery or invoice)
    # create an association between the Job's agent, the Job's customer and the new company.
    # 'agent.third_parties' will be a lot less complicated than a filter.
    #third_parties = models.ManyToManyField('self', null=True)

    def __str__(self):
        if self.name == '':
            return self.full_name
        return self.name


class Site(AdminAuditTrail):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sites')
    name = models.CharField(max_length=COMPANY_NAME_LENGTH)

    default_invoice = models.BooleanField(default=False)
    default_delivery = models.BooleanField(default=False)

    def __str__(self):
        if self.company.name == '':
            company = self.company.full_name
        else:
            company = self.company.name
        return f'({company}) {self.name}'


class Address(AdminAuditTrail):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='addresses')
    country = CountryField()
    region = models.CharField(max_length=REGION_NAME_LENGTH)
    postcode = models.CharField(max_length=10, blank=True)
    address = models.TextField()
    contact = models.CharField(max_length=PERSON_NAME_LENGTH, blank=True)

    valid_until = models.DateField(null=True, blank=True)

    def __str__(self):
        return f'({self.site.company.name}) {self.site.name} @ {self.created_on - datetime.timedelta(microseconds=self.created_on.microsecond)}'

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
    includes = models.ManyToManyField('self', related_name='included_in', symmetrical=False, blank=True)

    def get_description(self, lang):
        return self.descriptions.filter(language=lang).order_by('-last_updated')[0].description

    def __str__(self):
        return self.part_number + ': ' + self.name

class Description(AdminAuditTrail):
    last_updated = models.DateTimeField(auto_now=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='descriptions')
    language = models.CharField(max_length=2, choices=SUPPORTED_LANGUAGES)
    description = models.CharField(max_length=DOCS_ONE_LINER)

    def __str__(self):
        return f'[{self.language}, {self.product.part_number}] {self.product.name}'

class PriceList(AdminAuditTrail):
    valid_from = models.DateField()
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)

    def __str__(self):
        return self.name

class Price(models.Model):
    price_list = models.ForeignKey(PriceList, on_delete=models.CASCADE, related_name = 'prices')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='list_prices')
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    def __str__(self):
        return f'{self.price_list.name} {self.product.name} @ {self.currency} {self.value}'

# Support for modular ordering
class SlotChoiceList(models.Model):
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)
    choices = models.ManyToManyField(Product, related_name='in_slot_lists')

    def __str__(self):
        return self.name

class Slot(models.Model):
    parent = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='slots')
    name = models.CharField(max_length=SYSTEM_NAME_LENGTH)

    quantity = models.IntegerField(default=1)
    is_required = models.BooleanField()
    choices = models.ForeignKey(SlotChoiceList, on_delete=SET_NULL, related_name='used_by', null=True)

    def __str__(self):
        if self.is_required:
            req_str = '(REQ)'
        else:
            req_str = ''
        return self.name + ' slot ' + req_str + ' for ' + self.parent.name


# PO stuff
class PurchaseOrder(AdminAuditTrail):
    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='po')
    reference = models.CharField(max_length=PO_NAME_LENGTH)
    date_on_po = models.DateField()
    date_received = models.DateField()
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    def __str__(self):
        return f'{self.reference} from {self.job.invoice_to.site.company.name}'

class PriceAdjustment(AdminAuditTrail):
    """ Abstract class for discounts (or positive adjustments, I guess, rarities that they are :| ) """
    percentage = models.FloatField()
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)
    authorised_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='%(class)s_discounts', null=True)

    class Meta:
        abstract = True


class PriceAdjustmentItem(PriceAdjustment):
    """ Store price adjustments relating to a specific item """
    item = models.ForeignKey('JobItem', on_delete=models.CASCADE, related_name='price_adjustments')
    base_price = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    def __str__(self):
        return f'{self.percentage}% / {self.value} adjustment to {self.item}'

class PriceAdjustmentJob(PriceAdjustment):
    """ Store Job-level adjustments """
    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='price_adjustments')
    inv_description = models.CharField(max_length=DOCS_ONE_LINER) # so we don't have a mysterious figure just sort of floating on the invoice
    # maybe a dropdown to set some defaults? Like... "Less X% sales commission on Y", "Adjustment to reach agreed price of Y", "Contribution to customer discount"

    def __str__(self):
        return f'{self.job.name}: {self.inv_description}'

#Job stuff
class Job(AdminAuditTrail):
    name = models.CharField(max_length=JOB_NAME_LENGTH)
    customer = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='jobs_ordered', null=True)
    agent = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='jobs_linked', null=True)

    invoice_to = models.ForeignKey(Address, on_delete=models.PROTECT, related_name='jobs_invoiced')
    delivery_to = models.ForeignKey(Address, on_delete=models.PROTECT, related_name='jobs_delivered')

    country = CountryField()
    language = models.CharField(max_length=2, choices=SUPPORTED_LANGUAGES, default=DEFAULT_LANG)

    payment_terms = models.TextField()
    incoterm_code = models.CharField(max_length=3, choices=INCOTERMS)
    incoterm_location = models.CharField(max_length=30)

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
    product = models.ForeignKey(Product, on_delete=models.PROTECT, blank=True)
    price_list = models.ForeignKey(PriceList, on_delete=models.PROTECT, blank=True)

    quantity = models.IntegerField(blank=True)
    description = models.CharField(max_length=DOCS_ONE_LINER)
    selling_price = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    # Support for "nested" Products, e.g. Pez dispenser prices includes one packet of Pez; you also sell additional packets of Pez separately
    # The packet included with the dispenser would get its own JobItem where the dispenser JobItem would go in "included_with"
    included_with = models.ForeignKey('self', on_delete=models.CASCADE, related_name='includes', null=True)

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
    
    def inv_part(self):
        if self.invoice_wording != None:
            return self.invoice_wording.part_number
        elif self.product != '':
            return self.product.part_number
        else:
            return '-'
        
    def __str__(self):
        return f'({self.job.name}) {self.quantity} x {self.product.name}'

class JobModule(models.Model):
    parent = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='modules')
    child = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='module_of')
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name='usages')

    def __str__(self):
        return f'{self.slot.name} slot for {self.parent.product.name}'

class ProdGroup(AdminAuditTrail):
    date_requested = models.DateTimeField()
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
    """ Details which become available during/following production """
    item = models.ForeignKey(JobItem, on_delete=models.PROTECT, related_name = 'details')
    quantity = models.IntegerField(blank=True)
    date_finished = models.DateField(blank=True)

    def __str__(self):
        return f'{self.quantity} x ({self.item.job.name}) {self.item.quantity} x {self.item.product.name}, completed on {self.date_finished}'


class SpecificDetails(AdminAuditTrail):
    """ Further production details about one specific item or batch """
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
    recipient = models.ForeignKey(Site, on_delete=models.PROTECT, related_name='financials')
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    show_discounts = models.BooleanField(default=True)

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

