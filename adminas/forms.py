from django.forms import ModelForm, modelform_factory, ModelChoiceField, Textarea
from adminas.models import Job, JobItem, PurchaseOrder, Company, Address, Site


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
        exclude = ['valid_until', 'site']


class AddressModelChoiceField(ModelChoiceField):
    def label_from_instance(self, obj):
        inv = '[inv]' if obj.site.default_invoice else ''
        deliv = '[ship]' if obj.site.default_delivery else ''
        return "%s: %s %s%s" % (obj.site.company.name, obj.site.name, inv, deliv)

class JobForm(ModelForm):
    invoice_to = AddressModelChoiceField(queryset=Address.objects.filter(valid_until=None).order_by('-site__default_invoice'))
    delivery_to = AddressModelChoiceField(queryset=Address.objects.filter(valid_until=None).order_by('-site__default_delivery'))
    class Meta():
        model = Job
        fields = ['name', 'quote_ref', 'country', 'language', 'agent', 'customer', 'currency', 'payment_terms', 'incoterm_code', 'incoterm_location']
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

JobItemFormSet = modelform_factory(
    JobItem,
    fields=['product', 'description', 'quantity', 'price_list', 'selling_price'],
    labels = {
            'product': 'Part Number'
        }
)

