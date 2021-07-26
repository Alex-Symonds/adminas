from django.core.exceptions import NON_FIELD_ERRORS
from django.db import models
from django.contrib.auth.models import AbstractUser
#import datetime
from django.db.models.deletion import SET_NULL

from django_countries.fields import CountryField
#from django.core.validators import MinValueValidator

from decimal import Decimal
from .constants import SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, DEFAULT_LANG, INCOTERMS, THOUSAND_SEPARATOR

# Size fields
COMPANY_NAME_LENGTH = 100
PLACE_LENGTH = 100

JOB_NAME_LENGTH = 8 # YYMM-NNN
PART_NUM_LENGTH = 10
NAME_LENGTH = 50
PO_LENGTH = 50
DOCS_ONE_LINER = 300 # <- placeholder value until I check how many 'M's and how many 'i's fit on a single line, then pick something sorta in the middle

LENGTH_SERIAL_NUMBER = 6
MAX_DIGITS_PRICE = 9
F_PRICE_LENGTH = MAX_DIGITS_PRICE + 1 + (MAX_DIGITS_PRICE / 3) # <- + 1 for the decimal symbol; MAX/3 as an approximation for the thousands separator

# Create your models here.
class User(AbstractUser):
    pass

class AdminAuditTrail(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='records_added', null=True)

    class Meta:
        abstract = True

# Customers and partners
class Company(AdminAuditTrail):
    full_name = models.CharField(max_length=COMPANY_NAME_LENGTH)
    short_name = models.CharField(max_length=20, blank=True)
    currency = models.CharField(max_length=2, choices=SUPPORTED_CURRENCIES, blank=True)

    def __str__(self):
        if self.short_name == '':
            return self.full_name
        return self.short_name


class Site(AdminAuditTrail):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sites')
    name = models.CharField(max_length=COMPANY_NAME_LENGTH)

    def __str__(self):
        if self.company.short_name == '':
            company = self.company.full_name
        else:
            company = self.short_name
        return company + ', ' + self.name + ' site' 


class Address(AdminAuditTrail):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='addresses')
    country = CountryField()
    region = models.CharField(max_length=PLACE_LENGTH)
    postcode=models.CharField(max_length=10)
    address = models.TextField()

    def __str__(self):
        return self.site + ' address, ' + self.created_on

# Stuff on offer
class Product(AdminAuditTrail):
    available = models.BooleanField(deafult=True)
    name = models.CharField(max_length=NAME_LENGTH)
    part_number = models.CharField(max_length=PART_NUM_LENGTH)
    has_serial_number = models.BooleanField(default=False)

    # Support for package deals and standard accessories
    includes = models.ManyToManyField('self', related_name='included_in', symmetrical=False, blank=True)

    def __str__(self):
        return self.part_number + ': ' + self.name

class CustomsInfo(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='customs_info')
    hs_code = models.CharField(max_length=10)
    origin_country = CountryField()

    def __str__(self):
        return self.product + '(' + self.origin_country + ', ' + self.hs_code + ')'

class Description(AdminAuditTrail):
    last_updated = models.DateTimeField(auto_now=True)
    product = models.ForeignKey(Product, related_name='descriptions')
    language = models.CharField(max_length=2, choices=SUPPORTED_LANGUAGES)
    description = models.CharField(max_length=DOCS_ONE_LINER)

    def __str__(self):
        return '[' + self.language + '] ' + self.product

class PriceList(AdminAuditTrail):
    valid_from = models.DateField()
    name = models.CharField(max_length=NAME_LENGTH)

    def __str__(self):
        return self.name

class Price(models.Model):
    price_list = models.ForeignKey(PriceList, on_delete=models.CASCADE, related_name = 'prices')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='list_prices')
    currency = models.CharField(max_length=3, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    def __str__(self):
        return self.price_list + ' ' + self.product + ' @ ' + self.value + ' ' + self.currency

# Support for modular ordering
class SlotChoiceList(models.Model):
    name = models.CharField(max_length=NAME_LENGTH)
    choices = models.ManyToManyField(Product, related_name='in_slot_lists')

class Slot(models.Model):
    parent = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='slots')
    name = models.CharField(max_length=NAME_LENGTH)

    quantity = models.IntegerField(default=1)
    is_required = models.BooleanField()
    choices = models.ForeignKey(SlotChoiceList, on_delete=SET_NULL, related_name='used_by')

    def __str__(self):
        if self.is_required:
            req_str = '(REQ)'
        else:
            req_str = ''
        return self.name + ' slot ' + req_str + ' for ' + self.parent


# Specific orders
class PurchaseOrder(AdminAuditTrail):
    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='po')
    reference = models.CharField(max_length=PO_LENGTH)
    date_on_po = models.DateField()
    date_received = models.DateField()
    currency = models.CharField(max_length=2, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField()

class PriceAdjustment(AdminAuditTrail):
    """ Abstract class for discounts (or positive adjustments, I guess, rarities that they are :| ) """
    percentage = models.FloatField()
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)
    authorised_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='discounts', null=True)

    class Meta:
        abstract = True

class PriceAdjustmentItem(PriceAdjustment):
    """ Store price adjustments relating to a specific item """
    item = models.ForeignKey('JobItem', on_delete=models.CASCADE, related_name='price_adjustments')

    def __str__(self):
        return f'{self.percentage}% / {self.value} adjustment to {self.item}'

class PriceAdjustmentJob(PriceAdjustment):
    """ Store Job-level adjustments """
    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='price_adjustments')
    inv_description = models.CharField(max_length=DOCS_ONE_LINER) # so we don't have a mysterious figure just sort of floating on the invoice
    # maybe a dropdown to set some defaults? Like... "Less X% sales commission on Y", "Adjustment to reach agreed price of Y", "Contribution to customer discount"

    def __str__(self):
        return f'{self.job}: {self.inv_description}'

class Job(AdminAuditTrail):
    name = models.CharField(max_length=JOB_NAME_LENGTH)
    customer = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='jobs_ordered')
    sales_partner = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='jobs_linked', null=True)
    country = CountryField()
    language = models.CharField(max_length=2, choices=SUPPORTED_LANGUAGES, default=DEFAULT_LANG)

    payment_terms = models.TextField()
    incoterm_code = models.CharField(max_length=3, choices=INCOTERMS)
    incoterm_location = models.CharField(max_length=30)

    def __str__(self):
        return f'{self.name} {self.created_on}'

class JobItem(AdminAuditTrail):
    job = models.ForeignKey(Job, related_name='items') 
    product = models.ForeignKey(Product, on_delete=models.PROTECT, blank=True)
    price_list = models.ForeignKey(PriceList, on_delete=models.PROTECT, blank=True)

    quantity = models.IntegerField(blank=True)
    description = models.CharField(max_length=DOCS_ONE_LINER)
    base_price = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)
    selling_price = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    invoice_wording = models.ForeignKey('FinOverrides', related_name='src_items', null=True)

    def inv_description(self):
        if self.invoice_wording != None:
            return self.invoice_wording.description
        else:
            return self.description
    
    def inv_part(self):
        if self.invoice_wording != None:
            return self.invoice_wording.part_number
        elif self.product != '':
            return self.product.part_number
        else:
            return ''
        
    def __str__(self):
        return f'({self.job}) {self.quantity} x {self.product}'



class ItemDetails(AdminAuditTrail):
    item = models.ForeignKey(JobItem, on_delete=models.PROTECT, related_name = 'details')
    serial_number = models.CharField(max_length=LENGTH_SERIAL_NUMBER)
    date_finished = models.DateField()
    accessory_for = models.ForeignKey('self', on_delete=models.PROTECT, related_name = 'accessories', null=True)

    def __str__(self):
        return f'{self.serial_number} details'

class ItemPrAssignment(models.Model):
    group = models.ForeignKey('PrdGroup')
    item = models.ForeignKey(JobItem)
    quantity = models.IntegerField()

    def __str__(self):
        return self.group + ' <<< ' + self.quantity + ' from ' + self.item

class ProdGroup(AdminAuditTrail):
    date_requested = models.DateTimeField()
    date_scheduled = models.DateTimeField(blank=True)
    job = models.ForeignKey(Job, related_name='batches')
    name = models.CharField(max_length=NAME_LENGTH)
    items = models.ManyToManyField(JobItem, related_name='prod_groups', through=ItemPrAssignment)

    def __str__(self):
        return '(' + self.job + ') ' + self.name

# Finance support
class FinGroup(AdminAuditTrail):
    """ Group job content for a financial document (= invoice or credit note) """
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name='fin_groups')
    reference = models.CharField(max_length=10, blank=True)

    name = models.CharField(max_length=NAME_LENGTH, blank=True)
    recipient = models.ForeignKey(Site, on_delete=models.PROTECT, related_name='financials')
    currency = models.CharField(max_length=2, choices=SUPPORTED_CURRENCIES)
    value = models.DecimalField(max_digits=MAX_DIGITS_PRICE, decimal_places=2)

    show_discounts = models.BooleanField(default=True)

    def __str__(self):
        if self.name == '':
            show_name = 'Unnamed'
        else:
            show_name = self.name
        return show_name + ' for ' + self.job


class FinDisplayGroup(models.Model):
    """ Group JobItems for display purposes within the financial document, applying display settings """   
    group = models.ForeignKey(FinGroup, on_delete=models.CASCADE, related_name='subgroups')
    name = models.CharField(max_length=NAME_LENGTH, blank=True)
    description = models.CharField(max_length=DOCS_ONE_LINER, blank=True)

    show_description = models.BooleanField(default=False)
    show_details = models.BooleanField(default=True)
    show_subtotal = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.group}: {self.name}'

class FinOverrides(AdminAuditTrail):
    """ If the customer needs their own descriptions / part numbers to appear on line items, store them here """
    display_group = models.ForeignKey(FinDisplayGroup, on_delete=models.SET_NULL, related_name='desc_overrides', null=True)
    part_number = models.CharField(max_length=PART_NUM_LENGTH, blank=True)
    description = models.CharField(max_length=DOCS_ONE_LINER, blank=True)

    def __str__(self):
        if self.job_item != None:
            return f'Override {self.job_item} description'
        else:
            return f'Add line to {self.display_group}'




class AccountingEvent(AdminAuditTrail):
    """ Abstract class for the system's accounting data """
    currency = models.CharField(max_length=2, choices=SUPPORTED_CURRENCIES)
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

