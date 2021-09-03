from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect
from django.db import IntegrityError
from django.urls import reverse
from django.contrib.auth.decorators import login_required
import json
from django.http import JsonResponse

from adminas.models import User, Job, Address, PurchaseOrder, JobItem, Product, PriceList, StandardAccessory, Slot, Price, JobModule
from adminas.forms import JobForm, POForm, JobItemForm, JobItemFormSet, JobItemEditForm, JobModuleForm
from adminas.constants import ADDRESS_DROPDOWN
from adminas.util import anonymous_user, error_page, add_jobitem

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
            job_form = JobForm() #(auto_id="job_id_%s") for when there's more than one with the same fields

            # Note to self: you're planning to move the return outside of the if statement once you've setup the "else" block.
            # That's why you bothered with variables instead of directly setting these via the form classes
            return render(request, 'adminas/edit.html',{
                'job_form': job_form,
                'addr_ddopt': ADDRESS_DROPDOWN,
                'task_name': task_name
            })
        else:
            pass
            # load the formy page with inputs pre-populated with existing order data
    else:
        posted_form = JobForm(request.POST)
        if posted_form.is_valid():
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
            return HttpResponseRedirect(reverse('job', kwargs={'job_id': new_job.id}))
    
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
        'po_list': po_list,
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
        formset = JobItemFormSet(request.POST)
        if formset.is_valid():
            for form in formset:
                add_jobitem(request.user, form)

            return HttpResponseRedirect(reverse('job', kwargs={'job_id': form.cleaned_data['job'].id}))
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
        return anonymous_user()

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
        return anonymous_user()

    if request.method == 'GET':
        data_wanted = request.GET.get('return')
        parent = JobItem.objects.get(id=request.GET.get('parent'))
        slot = Slot.objects.get(id=request.GET.get('slot'))
        
        data_f = []
        if data_wanted == 'jobitems':
            for ji in slot.valid_jobitems(parent):
                ji_f = {}
                ji_f['id'] = ji.id
                ji_f['quantity'] = ji.quantity
                ji_f['name'] = ji.product.part_number + ': ' + ji.product.name
                data_f.append(ji_f)

        elif data_wanted == 'products':
            for prod in slot.choice_list():
                pr_f = {}
                pr_f['id'] = prod.id
                pr_f['name'] = prod.part_number + ': ' + prod.name
                pr_f['price_f'] = parent.currency + ' ' + Price.objects.filter(product=prod).filter(price_list=parent.price_list).filter(currency=parent.job.currency).value_f()
                data_f.append(pr_f)
        
        elif data_wanted == 'max_quantity':
            child = JobItem.objects.get(id=request.GET.get('child'))
            child_remaining = child.num_unassigned()
            slot_remaining = slot.num_empty_spaces(parent)

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
            jobmod = JobModule(
                parent = posted_form.cleaned_data['parent'],
                child = posted_form.cleaned_data['child'],
                slot = posted_form.cleaned_data['slot'],
                quantity = 1
            )
            jobmod.save()
            return JsonResponse({
                'id': jobmod.id
            }, status=201)
        
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

            jm.delete()
            return JsonResponse({
                'message': 'Deleted JobModule slot assignment.'
            }, status=200)
        


        elif put_data['action'] == 'edit_qty':

            new_qty = int(put_data['qty'].strip())

            # Check the qty has changed
            print('------------------------------------')
            print(put_data)
            print('-------------------------------------')


            if int(put_data['prev_qty']) == new_qty:
                return JsonResponse({
                    'message': 'No changes required.'
                }, status=200)

            # Handle it if the new qty is <= 0
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

            # Edit the quantity
            jm.quantity = new_qty
            jm.save()
            return JsonResponse({
                'message': 'Quantity has been updated.'
            }, status=200)  
                        





    



def status(request):
    return render(request, 'adminas/status.html')

def records(request):
    return render(request, 'adminas/records.html')




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
