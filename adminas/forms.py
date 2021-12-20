from django.db.models.base import Model
from django.forms import ModelForm, modelformset_factory, modelform_factory, ModelChoiceField, Textarea, HiddenInput, BooleanField, CheckboxInput
from adminas.models import Job, JobComment, JobItem, JobModule, PurchaseOrder, Company, Address, Site, Product, DocumentData, ProductionData, DocumentVersion


class CompanyForm(ModelForm):
    class Meta():
        model = Company
        fields = ['full_name', 'name', 'currency', 'is_agent']
        labels = {
            'name': 'Short name',
            'is_agent': 'This company is an agent',
            'currency': 'Account currency'
        }


class SiteForm(ModelForm):
    class Meta():
        model = Site
        fields = ['name', 'default_invoice', 'default_delivery']
        labels = {
            'name': 'Short name (for dropdowns)',
            'default_invoice': 'Set as default invoice address',
            'default_delivery': 'Set as default delivery address'
        }


class AddressForm(ModelForm):
    class Meta():
        model = Address
        exclude = ['site',]


class AddressModelChoiceField(ModelChoiceField):
    def label_from_instance(self, obj):
        inv = '[inv]' if obj.site.default_invoice else ''
        deliv = '[ship]' if obj.site.default_delivery else ''
        return f'{obj.site.company.name}: {obj.site.name} {inv}{deliv}'


class JobForm(ModelForm):
    invoice_to = AddressModelChoiceField(queryset=Address.objects.order_by('-site__default_invoice'))
    delivery_to = AddressModelChoiceField(queryset=Address.objects.order_by('-site__default_delivery'))
    class Meta():
        model = Job
        fields = ['name', 'quote_ref', 'country', 'language', 'agent', 'customer', 'currency', 'payment_terms', 'incoterm_code', 'incoterm_location', 'invoice_to', 'delivery_to']
        labels = {
            'name': 'Job ID'
        }

        widgets = {
            'payment_terms': Textarea(attrs={'cols': 30, 'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        super(JobForm, self).__init__(*args, **kwargs)
        self.fields['agent'].queryset = Company.objects.filter(
                                        is_agent=True)


PoFormSet = modelform_factory(
    model = PurchaseOrder,
    fields = ['reference', 'date_on_po', 'date_received', 'currency', 'value'],
    labels = {
        'reference': 'Customer PO Number',
        'date_on_po': 'Date on PO'
    }
)


class JobItemPriceForm(ModelForm):
    class Meta():
        model = JobItem
        fields = ['selling_price']


class JobItemForm(ModelForm):
    class Meta():
        model = JobItem
        fields=['job', 'quantity', 'product', 'price_list', 'selling_price']
        labels = {
                'product': 'Item'
            }
        widgets = {
            'job': HiddenInput()
        }

    def __init__(self, *args, **kwargs):
        super(JobItemForm, self).__init__(*args, **kwargs)
        self.fields['product'].queryset = Product.objects.order_by('part_number')


JobItemFormSet = modelformset_factory(
    JobItem,
    form=JobItemForm,
    extra=1
)


class JobItemEditForm(ModelForm):
    class Meta():
        model = JobItem
        fields = ['quantity', 'product', 'price_list', 'selling_price']


class JobModuleForm(ModelForm):
    class Meta():
        model = JobModule
        fields = ['quantity', 'parent', 'child', 'slot',]


class POForm(ModelForm):
    class Meta():
        model = PurchaseOrder
        fields = ['job', 'reference', 'date_on_po', 'date_received', 'currency', 'value']
        labels = {
            'reference': 'Customer PO Number',
            'date_on_po': 'Date on PO'
        }
        widgets = {
            'job': HiddenInput()
        }


class DocumentDataForm(ModelForm):
    class Meta():
        model = DocumentData
        fields = ['reference']


class DocumentVersionForm(ModelForm):
      class Meta():
        model = DocumentVersion
        fields = ['issue_date']  


class ProductionReqForm(ModelForm):
    class Meta():
        model = ProductionData
        fields = ['date_requested', 'date_scheduled']
 

class JobCommentFullForm(ModelForm):
    pinned = BooleanField(label='Pin to order', required=False, widget=CheckboxInput())
    highlighted = BooleanField(label='Highlight', required=False, widget=CheckboxInput())
    
    class Meta():
        model = JobComment
        fields = ['private', 'contents', 'pinned', 'highlighted']