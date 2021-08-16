from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect
from django.db import IntegrityError
from django.urls import reverse
from django.contrib.auth.decorators import login_required
import json
from django.http import JsonResponse

from adminas.models import User, Job, Address, PurchaseOrder, JobItem, Product
from adminas.forms import JobForm, POForm, JobItemForm, JobItemFormSet, JobItemEditForm
from adminas.constants import ADDRESS_DROPDOWN
from adminas.util import anonymous_user, error_page

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
                incoterm_location = posted_form['incoterm_location'],
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
    item_list = JobItem.objects.filter(job=my_job)

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
                ji = JobItem(
                    created_by = request.user,
                    job = form.cleaned_data['job'],
                    product = form.cleaned_data['product'],
                    price_list = form.cleaned_data['price_list'],
                    quantity = form.cleaned_data['quantity'],
                    selling_price = form.cleaned_data['selling_price']
                )
                ji.save()
            return HttpResponseRedirect(reverse('job', kwargs={'job_id': form.cleaned_data['job'].id}))
        else:
            return error_page(request, 'Item form was invalid.', 400)
            
    elif request.method == 'PUT':
        put_data = json.loads(request.body)
        form = JobItemEditForm(put_data)
        ji_id = request.GET.get('id')
        
        if form.is_valid():
            ji = JobItem.objects.get(id=ji_id)
            ji.quantity = form.cleaned_data['quantity']
            ji.product = form.cleaned_data['product']
            ji.selling_price = form.cleaned_data['selling_price']
            ji.price_list = form.cleaned_data['price_list']
            ji.save()

            return JsonResponse({
                'message': 'Item has been updated.'
            }, status=200)
        else:
            error_page(request, 'Item has not been updated.', 400)
    elif request.method == 'GET':
        product_id = request.GET.get('product_id')
        job_id = request.GET.get('job_id')
        lang = Job.objects.get(id=job_id).language
        description = Product.objects.get(id=product_id).get_description(lang)

        #            'info': 'product # ' + product_id + ', job #' + job_id,
        return JsonResponse({
            'desc': description
        }, status=200)        



def status(request):
    return render(request, 'adminas/status.html')

def records(request):
    return render(request, 'adminas/records.html')
