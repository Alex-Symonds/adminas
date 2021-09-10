from django.core.exceptions import RequestDataTooBig
from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect
from django.db import IntegrityError
from django.urls import reverse
from django.contrib.auth.decorators import login_required
import json
from django.http import JsonResponse
from django.db.models import Sum, Count

from adminas.models import User, Job, Address, PurchaseOrder, JobItem, Product, PriceList, StandardAccessory, Slot, Price, JobModule
from adminas.forms import JobForm, POForm, JobItemForm, JobItemFormSet, JobItemEditForm, JobModuleForm
from adminas.constants import ADDRESS_DROPDOWN
from adminas.util import anonymous_user, error_page, add_jobitem, debug, format_money

# Create your views here.
def login_view(request):
    if request.method == 'POST':

        # Attempt to sign user in
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse('index'))
        else:
            return render(request, 'adminas/login.html', {
                'message': '<span>ACCESS DENIED</span><br>Invalid username and/or password.'.upper()
            })
    else:
        return render(request, 'adminas/login.html')

def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse('index'))


def register(request):
    if request.method == 'POST':
        username = request.POST['username']
        email = request.POST['email']

        # Ensure password matches confirmation
        password = request.POST['password']
        confirmation = request.POST['confirmation']
        if password != confirmation:
            return render(request, 'adminas/register.html', {
                'message': '<span>ERROR</span><br>Passwords must match.'
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, 'adminas/register.html', {
                'message': '<span>ERROR</span><br>Username already taken.'
            })
        login(request, user)
        return HttpResponseRedirect(reverse('index'))
    else:
        return render(request, 'adminas/register.html')

def index(request):
    return render(request, 'adminas/index.html')

def edit_job(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)

    default_get = '-'

    if request.method == 'GET':
        job_id = request.GET.get('job', default_get)

        if job_id == default_get:
            task_name = 'Create New'
            job_form = JobForm()
            job_id = 0

        else:
            try:
                job = Job.objects.get(id=job_id)
            except:
                return error_page(request, 'Invalid Job ID.', 400)

            task_name = 'Edit'
            job_form = JobForm(instance=job)
            job_id = job.id


        return render(request, 'adminas/edit.html',{
            'job_form': job_form,
            'addr_ddopt': ADDRESS_DROPDOWN,
            'task_name': task_name,
            'job_id': job_id
        })

    elif request.method == 'POST':
        job_id = request.POST['job_id']
        posted_form = JobForm(request.POST)

        if posted_form.is_valid():
            if job_id == '0':
                new_job = Job(
                    created_by = request.user,
                    name = posted_form.cleaned_data['name'],
                    agent = posted_form.cleaned_data['agent'],
                    customer = posted_form.cleaned_data['customer'],
                    country = posted_form.cleaned_data['country'],
                    language = posted_form.cleaned_data['language'],
                    quote_ref = posted_form.cleaned_data['quote_ref'],
                    currency = posted_form.cleaned_data['currency'],
                    payment_terms = posted_form.cleaned_data['payment_terms'],
                    incoterm_code = posted_form.cleaned_data['incoterm_code'],
                    incoterm_location = posted_form.cleaned_data['incoterm_location'],
                    invoice_to = posted_form.cleaned_data['invoice_to'],
                    delivery_to = posted_form.cleaned_data['delivery_to']
                )
                new_job.save()
                redirect_id = new_job.id

            else:
                job = Job.objects.get(id=job_id)
                job.created_by = request.user
                job.name = posted_form.cleaned_data['name']
                job.agent = posted_form.cleaned_data['agent']
                job.customer = posted_form.cleaned_data['customer']
                job.country = posted_form.cleaned_data['country']
                job.language = posted_form.cleaned_data['language']
                job.quote_ref = posted_form.cleaned_data['quote_ref']
                job.currency = posted_form.cleaned_data['currency']
                job.payment_terms = posted_form.cleaned_data['payment_terms']
                job.incoterm_code = posted_form.cleaned_data['incoterm_code']
                job.incoterm_location = posted_form.cleaned_data['incoterm_location']
                job.invoice_to = posted_form.cleaned_data['invoice_to']
                job.delivery_to = posted_form.cleaned_data['delivery_to']
                job.save()
                redirect_id = job_id

            return HttpResponseRedirect(reverse('job', kwargs={'job_id': redirect_id}))


    
    return render(request, 'adminas/edit.html')

def job(request, job_id):
    if not request.user.is_authenticated:
        return anonymous_user(request)

    my_job = Job.objects.get(id=job_id)
    po_list = PurchaseOrder.objects.filter(job=my_job)
    item_formset = JobItemFormSet(queryset=JobItem.objects.none(), initial=[{'job':job_id}])

    item_list = JobItem.objects.filter(job=my_job).filter(included_with=None)
    if item_list.count() == 0:
        item_list = None

    return render(request, 'adminas/job.html', {
        'job': my_job,
        'po_form': POForm(initial={'job': my_job.id}),
        'po_list': my_job.po.all(),#po_list,
        'item_formset': item_formset,
        'item_list': item_list
    })

def purchase_order(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)
    
    if request.method == 'POST':
        posted_form = POForm(request.POST)
        if posted_form.is_valid():
            po = PurchaseOrder(
                created_by = request.user,
                job = posted_form.cleaned_data['job'],
                reference = posted_form.cleaned_data['reference'],
                date_on_po = posted_form.cleaned_data['date_on_po'],
                date_received = posted_form.cleaned_data['date_received'],
                currency = posted_form.cleaned_data['currency'],
                value = posted_form.cleaned_data['value']
            )
            po.save()
            return HttpResponseRedirect(reverse('job', kwargs={'job_id': posted_form.cleaned_data['job'].id }))

def items(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)
    
    if request.method == 'POST':
        posted_data = json.loads(request.body)

        if 'source_page' not in posted_data:
            formset = JobItemFormSet(request.POST)
            if formset.is_valid():
                for form in formset:
                    add_jobitem(request.user, form)
                return HttpResponseRedirect(reverse('job', kwargs={'job_id': form.cleaned_data['job'].id}))
            else:
                return error_page(request, 'Item form was invalid.', 400)

        elif posted_data['source_page'] == 'module_management':
            # Add a JobItem based on modular info, then return the JobItem ID
            parent = JobItem.objects.get(id=posted_data['parent'])
            my_product = Product.objects.get(id=posted_data['product'])
            form = JobItemForm({
                'job': parent.job,
                'quantity': posted_data['quantity'],
                'product': my_product.id,
                'price_list': parent.price_list,
                'selling_price': my_product.get_price(parent.job.currency, parent.price_list)
            })
            if form.is_valid():
                ji = add_jobitem(request.user, form)
                return JsonResponse({
                    'id': ji.id
                }, status=200)
            else:
                return error_page(request, 'Item form was invalid.', 400)
            
    elif request.method == 'PUT':
        ji_id = request.GET.get('id')
        ji = JobItem.objects.get(id=ji_id)

        if request.GET.get('delete'):
            ji.delete()
            return JsonResponse({
                'message': 'Deleted record.'
            }, status=200)

        put_data = json.loads(request.body)
        form = JobItemEditForm(put_data)
        if form.is_valid():
            previous_product = ji.product
            previous_qty = ji.quantity

            ji.quantity = form.cleaned_data['quantity']
            ji.product = form.cleaned_data['product']
            ji.selling_price = form.cleaned_data['selling_price']
            ji.price_list = form.cleaned_data['price_list']
            ji.save()

            if previous_product != ji.product:
                ji.reset_standard_accessories()

            elif previous_qty != ji.quantity:
                ji.update_standard_accessories_quantities()

            return JsonResponse(ji.get_post_edit_dictionary(), status=200)

        else:
            error_page(request, 'Item has not been updated.', 400)


    elif request.method == 'GET':
        product_id = request.GET.get('product_id')
        job_id = request.GET.get('job_id')
        lang = Job.objects.get(id=job_id).language
        description = Product.objects.get(id=product_id).get_description(lang)

        return JsonResponse({
            'desc': description
        }, status=200)        


def manage_modules(request, job_id):

    if not request.user.is_authenticated:
        return anonymous_user(request)

    job = Job.objects.get(id=job_id)

    # Get a list of JobItems in this Job which have modules
    job_items = JobItem.objects.filter(job=job)
    modular_jobitems = []
    for ji in job_items:
        if ji.product.is_modular():
            modular_jobitems.append(ji)
    
    if len(modular_jobitems) == 0:
        return error_page('This job has no modular items, so there are no modules to manage.')
 
    return render(request, 'adminas/manage_modules.html', {
        'job': job,
        'items': modular_jobitems
    })
    

def module_assignments(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)

    if request.method == 'GET':
        data_wanted = request.GET.get('return')
        parent = JobItem.objects.get(id=request.GET.get('parent'))
        slot = Slot.objects.get(id=request.GET.get('slot'))
        
        data_f = []
        if data_wanted == 'jobitems':
            eligible_ji_unsorted = slot.valid_jobitems(parent)
            sorted_eligible = sorted(eligible_ji_unsorted, key= lambda t: t.num_unassigned(), reverse=True)
            for ji in sorted_eligible:
                ji_f = {}
                ji_f['id'] = ji.id
                ji_f['quantity'] = ji.num_unassigned()
                ji_f['name'] = ji.product.part_number + ': ' + ji.product.name
                data_f.append(ji_f)

        elif data_wanted == 'products':
            for prod in slot.choice_list():
                price_obj = Price.objects.filter(product=prod).filter(price_list=parent.price_list).filter(currency=parent.job.currency)[0]

                pr_f = {}
                pr_f['id'] = prod.id
                pr_f['name'] = prod.part_number + ': ' + prod.name
                pr_f['value'] = price_obj.value
                pr_f['price_f'] = parent.job.currency + ' ' + price_obj.value_f()
                data_f.append(pr_f)
        
            data_f = sorted(data_f, key= lambda pr: pr['value'])
            for d in data_f:
                del d['value']

        elif data_wanted == 'max_quantity':
            # As of 2021-09-06, this isn't used for anything. Keep for now, since it seems it could be useful. If not, delete later
            child = JobItem.objects.get(id=request.GET.get('child'))
            child_remaining = child.num_unassigned()
            slot_remaining = parent.num_empty_spaces(slot)

            qty = {}
            qty['max_qty'] = min(child_remaining, slot_remaining)
            data_f.append(qty)

        return JsonResponse({
            'data': data_f
        }, status=200)



    elif request.method == 'POST': 
        posted_data = json.loads(request.body)
        posted_form = JobModuleForm(posted_data)

        if posted_form.is_valid():
            jm = JobModule(
                parent = posted_form.cleaned_data['parent'],
                child = posted_form.cleaned_data['child'],
                slot = posted_form.cleaned_data['slot'],
                quantity = 1
            )
            if jm.child.num_unassigned() >= 1:
                jm.save()
                data_dict = jm.parent.get_slot_status_dictionary(jm.slot)
                data_dict['id'] = jm.id
                return JsonResponse(data_dict, status=201)

            else:
                return JsonResponse({
                    'message': 'Child item is already fully assigned to slots.'
                }, status=400)
        
        else:
            return JsonResponse({
                'message': 'POST data was invalid.'
            }, status=400)



    elif request.method == 'PUT':
        put_data = json.loads(request.body)

        if put_data['action'] == 'delete':
            try:
                jm = JobModule.objects.get(id=put_data['id'])
    
            except:
                return JsonResponse({
                    'message': 'PUT data was invalid.'
                }, status=400)

            parent = jm.parent
            slot = jm.slot
            jm.delete()
            return JsonResponse(parent.get_slot_status_dictionary(slot), status=200)
        


        elif put_data['action'] == 'edit_qty':

            # Maybe the user entered symbols permitted by 'type=number', but which don't actually result in a number
            # (e.g. e, +, -)
            if put_data['qty'] == '':
                return JsonResponse({
                    'message': 'Invalid quantity.'
                }, status=400)

            new_qty = int(put_data['qty'].strip())

            # Maybe the new qty is the same as the old qty, so there's nothing to be done
            if int(put_data['prev_qty']) == new_qty:
                return JsonResponse({
                    'message': 'No changes required.'
                }, status=200)

            # Maybe the user entered a new qty of 0 or a negative number
            if new_qty <= 0:
                return JsonResponse({
                    'message': 'Edit failed. Quantity must be 1 or more.'
                }, status=400)

            # Ensure valid JobModule ID
            try:
                jm = JobModule.objects.get(id=put_data['id'])
    
            except:
                return JsonResponse({
                    'message': 'PUT data was invalid.'
                }, status=400)            

            # Maybe the user entered a qty which exceeds the number of unassigned job items on the order
            num_unassigned = jm.child.num_unassigned()
            old_qty = jm.quantity
            if num_unassigned + old_qty < new_qty:
                return JsonResponse({
                    'message': 'Insufficient unassigned items.',
                    'max_qty': num_unassigned
                }, status=400)          

            # Edit the quantity
            jm.quantity = new_qty
            jm.save()
            dict = jm.parent.get_slot_status_dictionary(jm.slot)
            return JsonResponse(jm.parent.get_slot_status_dictionary(jm.slot), status=200)

                        
def get_data(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)

    if request.method == 'GET':
        info_requested = request.GET.get('info')

        if info_requested == 'site_address':
            addr_id = request.GET.get('id')

            try:
                req_addr = Address.objects.get(id=addr_id)
            except:
                return JsonResponse({
                    'message': 'Invalid address ID.'
                }, status=400)
            
            company = req_addr.site.company
            return JsonResponse({
                'address': req_addr.address,
                'region': req_addr.region,
                'postcode': req_addr.postcode,
                'country': req_addr.country.name
            }, status=200)

    




    



def status(request):
    return render(request, 'adminas/status.html')

def records(request):
    all_jobs = Job.objects.all()
    data = all_jobs.annotate(total_po_value=Sum('po__value')).annotate(num_po=Count('po'))

    for j in data:
        j.total_po_value_f = format_money(j.total_po_value)

    return render(request, 'adminas/records.html', {
        'data': data
    })




# probably deleting stuff below here
def prices(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)
    
    if request.method == 'GET':
        jobitem_id = request.GET.get('ji_id')
        ji = JobItem.objects.get(id=jobitem_id)

        if ji == None:
            return error_page("Can't find JobItem")

        return JsonResponse({
            'list_price_f': ji.list_price_f(),
            'list_difference_value_f': ji.list_difference_value_f(),
            'list_difference_perc_f': ji.list_difference_perc_f(),
            'resale_price_f': ji.resale_price_f(),
            'resale_percentage': ji.resale_percentage(),
            'resale_difference_value_f': ji.resale_difference_value_f(),
            'resale_difference_perc_f': ji.resale_difference_perc_f(),
            'total_sold_f': ji.job.total_value_f(),
            'total_list_f': ji.job.total_list_price_f(),
            'total_list_diff_val_f': ji.job.total_list_diff_value_f(),
            'total_list_diff_perc': ji.job.total_list_diff_perc()
        }, status=200)
