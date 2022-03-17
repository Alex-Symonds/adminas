from django.contrib import admin
from django import forms

# Register your models here.
from .models import JobItem, SpecialInstruction, User, Job, Company, Site, Address, Product, Description, Price, PriceList, SlotChoiceList, Slot, ResaleCategory, AgentResaleGroup, PurchaseOrder, DocumentData, ProductionData, DocumentVersion, DocAssignment, JobComment, JobModule, DocumentStaticMainFields, DocumentStaticOptionalFields, DocumentStaticSpecialInstruction, DocumentStaticLineItem


# Job admin page (include PO, JobItem, DocumentData)
class POInline(admin.TabularInline):
    model = PurchaseOrder
    extra = 0


class JobItemInline(admin.TabularInline):
    model = JobItem
    extra = 0


class DocumentDataInline(admin.TabularInline):
    model = DocumentData
    extra = 0


class JobAdmin(admin.ModelAdmin):
    model = Job
    inlines = [
        POInline,
        JobItemInline,
        DocumentDataInline,
    ]



# Company admin (include Site, AgentResaleGroups)
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




# Site admin (include Address)
class AddressInline(admin.StackedInline):
    model = Address
    extra = 0


class SiteAdmin(admin.ModelAdmin):
    model = Site
    inlines = [
        AddressInline,
    ]




# Product admin (include Description, StandardAccessories, Alots)
class DescriptionInline(admin.TabularInline):
    model = Description
    extra = 0

    def formfield_for_dbfield(self, db_field, **kwargs):
        formfield = super(DescriptionInline, self).formfield_for_dbfield(db_field, **kwargs)
        if db_field.name == 'description':
            formfield.widget = forms.Textarea(attrs=formfield.widget.attrs)
        return formfield


class StandardAccessoriesInline(admin.TabularInline):
    model = Product.includes.through
    fk_name = 'parent'
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






# PriceList admin (include Price)
class PriceInline(admin.TabularInline):
    model = Price
    extra = 0


class PriceListAdmin(admin.ModelAdmin):
    model = PriceList
    inlines = [
        PriceInline,
    ]





# Standard Resale admin (include group members)
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




# Agent Resale
class ProductResaleAgentInline(admin.TabularInline):
    model = Product.special_resale.through


class AgentResaleAdmin(admin.ModelAdmin):
    model = AgentResaleGroup
    inlines = [
        ProductResaleAgentInline,
    ]
 




# Documents
class ProductionDataInline(admin.TabularInline):
    model = ProductionData
    extra = 0


class DocAssignmentInline(admin.TabularInline):
    model = DocAssignment
    extra = 0


class SpecialInstructionInline(admin.TabularInline):
    model = SpecialInstruction
    extra = 0


class DocumentStaticMainFieldsInline(admin.TabularInline):
    model = DocumentStaticMainFields
    extra = 0


class DocumentStaticOptionalFieldsInline(admin.TabularInline):
    model = DocumentStaticOptionalFields
    extra = 0


class DocumentStaticSpecialInstructionInline(admin.TabularInline):
    model = DocumentStaticSpecialInstruction
    extra = 0


class DocumentStaticLineItemInline(admin.TabularInline):
    model = DocumentStaticLineItem
    extra = 0


class DocumentVersionAdmin(admin.ModelAdmin):
    model = DocumentVersion
    inlines = [
        ProductionDataInline,
        DocAssignmentInline,
        SpecialInstructionInline,
        DocumentStaticMainFieldsInline,
        DocumentStaticOptionalFieldsInline,
        DocumentStaticSpecialInstructionInline,
        DocumentStaticLineItemInline
    ]







admin.site.register(User)
admin.site.register(Job, JobAdmin)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Site, SiteAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(PriceList, PriceListAdmin)
admin.site.register(SlotChoiceList)
admin.site.register(ResaleCategory, ResaleCategoryAdmin)
admin.site.register(AgentResaleGroup, AgentResaleAdmin)
admin.site.register(PurchaseOrder)
admin.site.register(DocumentVersion, DocumentVersionAdmin)
admin.site.register(JobComment)
admin.site.register(JobModule)



