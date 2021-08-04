from django.forms import ModelForm, modelform_factory, ModelChoiceField
from adminas.models import Job, JobItem, PurchaseOrder, Company, Address

class AddressModelChoiceField(ModelChoiceField):
    def label_from_instance(self, obj):
        return "%s: %s" % (obj.site.company.name, obj.site.name)



class JobForm(ModelForm):
    invoice_to = AddressModelChoiceField(queryset=Address.objects.all())
    delivery_to = AddressModelChoiceField(queryset=Address.objects.all())
    class Meta():
        model = Job
        fields = ['name', 'quote_ref', 'country', 'language', 'agent', 'customer', 'currency', 'payment_terms', 'incoterm_code', 'incoterm_location']
        labels = {
            'name': 'Job ID'
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

