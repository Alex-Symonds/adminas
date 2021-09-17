from django.contrib import admin

# Register your models here.
from .models import JobItem, User, Job, Company, Site, Address, Product, Description, Price, PriceList, SlotChoiceList, Slot, StandardAccessory, ResaleCategory, AgentResaleGroup, PurchaseOrder, AccEventOE

# Register your models here.

class POInline(admin.TabularInline):
    model = PurchaseOrder
    extra = 0

class JobItemInline(admin.TabularInline):
    model = JobItem
    extra = 0

class JobAdmin(admin.ModelAdmin):
    model = Job
    inlines = [
        POInline,
        JobItemInline,
    ]


class ProductResaleInline(admin.TabularInline):
    model = Product
    fields = (['part_number', 'name'])
    readonly_fields = (['part_number', 'name'])

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

class ResaleCategoryAdmin(admin.ModelAdmin):
    model = ResaleCategory
    inlines = [
        ProductResaleInline,
    ]

class ProductResaleAgentInline(admin.TabularInline):
    model = Product.special_resale.through


class AgentResaleAdmin(admin.ModelAdmin):
    model = AgentResaleGroup
    inlines = [
        ProductResaleAgentInline,
    ]


class PriceInline(admin.TabularInline):
    model = Price
    extra = 0

class PriceListAdmin(admin.ModelAdmin):
    model = PriceList
    inlines = [
        PriceInline,
    ]

class CompanyDealsInline(admin.TabularInline):
    model = AgentResaleGroup
    extra = 0

class CompanySitesInline(admin.TabularInline):
    model = Site
    extra = 0

class CompanyAdmin(admin.ModelAdmin):
    model = Company
    inlines = [
        CompanySitesInline,
        CompanyDealsInline,
    ]   

class AddressInline(admin.StackedInline):
    model = Address
    extra = 0

class SiteAdmin(admin.ModelAdmin):
    model = Site
    inlines = [
        AddressInline,
    ]

class DescriptionInline(admin.TabularInline):
    model = Description
    extra = 0

class StandardAccessoriesInline(admin.TabularInline):
    model = Product.includes.through
    fk_name = 'accessory'
    extra = 0

class SlotsInline(admin.TabularInline):
    model = Slot
    extra = 0

class ProductAdmin(admin.ModelAdmin):
    model = Product
    inlines = [
        DescriptionInline,
        StandardAccessoriesInline,
        SlotsInline,
    ]



admin.site.register(User)
admin.site.register(Job, JobAdmin)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Site, SiteAdmin)
admin.site.register(Address)
admin.site.register(Product, ProductAdmin)
admin.site.register(Description)
#admin.site.register(Price)
admin.site.register(PriceList, PriceListAdmin)
admin.site.register(SlotChoiceList)
#admin.site.register(Slot)
#admin.site.register(StandardAccessory)
admin.site.register(ResaleCategory, ResaleCategoryAdmin)
admin.site.register(AgentResaleGroup, AgentResaleAdmin)
admin.site.register(AccEventOE)
admin.site.register(PurchaseOrder)

