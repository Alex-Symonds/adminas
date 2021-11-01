from django.core.exceptions import RequestDataTooBig
from django.db.models.fields import NullBooleanField
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.db import IntegrityError
from django.urls import reverse
from django.contrib.auth.decorators import login_required
import json
from django.db.models import Sum, Count
from django.core.paginator import Paginator

from decimal import Decimal
import datetime
from django.utils import formats

# PDF stuff ----------------------------------------------
from django.views.generic.base import View
from wkhtmltopdf.views import PDFTemplateResponse
# --------------------------------------------------------

from adminas.models import SpecialInstruction, User, Job, Address, PurchaseOrder, JobItem, Product, PriceList, StandardAccessory, Slot, Price, JobModule, AccEventOE, DocumentData, DocAssignment, ProductionData, DocumentVersion, JobComment
from adminas.forms import DocumentDataForm, JobForm, POForm, JobItemForm, JobItemFormSet, JobItemEditForm, JobModuleForm, JobItemPriceForm, ProductionReqForm, DocumentVersionForm, JobCommentFullForm
from adminas.constants import ADDRESS_DROPDOWN, DOCUMENT_TYPES, MAX_ROWS_OC
from adminas.util import anonymous_user, error_page, add_jobitem, debug, format_money, create_oe_event

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
    if not request.user.is_authenticated:
        return anonymous_user(request)

    user = request.user
    jobs = user.todo_list_jobs.all().order_by('-created_on')

    jobs_list = []
    for j in jobs:
        job = {}
        job['id'] = j.id
        job['name'] = j.name
        job['flag_alt'] = j.country.name
        job['flag_url'] = j.country.flag
        job['customer'] = j.customer.name if j.customer != None else None
        job['agent'] = j.agent.name if j.agent != None else None
        job['currency'] = j.currency
        job['value'] = j.total_value_f()
        job['admin_warnings'] = j.admin_warnings()
        job['pinned_comments'] = j.get_pinned_comments(request.user, '-created_by')

        jobs_list.append(job)

    return render(request, 'adminas/index.html', {
        'data': jobs_list
    })





def todo_list_management(request):
    if not request.user.is_authenticated:
        return JsonResponse({
            'message': "You must be logged in to update the to-do list."
        },status=400)   

    if request.method == 'POST':
        posted_data = json.loads(request.body)

        if 'job_id' in posted_data and 'task' in posted_data:
            try:
                user = User.objects.get(username=request.user.username)
            except User.DoesNotExist:
                return JsonResponse({
                    'message': "Failed to update to-do list: can't find user."
                }, status=400)

            try:
                job = Job.objects.get(id=posted_data['job_id'])
            except Job.DoesNotExist:
                return JsonResponse({
                    'message': "Failed to update to-do list: can't find job."
                }, status=400)

            # Get the task and perform it
            if 'remove' == posted_data['task']:
                if job in user.todo_list_jobs.all():
                    user.todo_list_jobs.remove(job)
                    user.save()
                    return JsonResponse({
                        'id': posted_data['job_id']
                    }, status=200)

            elif 'add' == posted_data['task']:
                if not job in user.todo_list_jobs.all():
                    user.todo_list_jobs.add(job)
                    user.save()
                    return JsonResponse({
                        'status': 'ok'
                    }, status=200)

            else:
                return JsonResponse({
                    'message': "Failed to update to-do list: invalid task."
                }, status=400)

        else:
            return JsonResponse({
                'message': "Failed to update to-do list: incomplete instructions."
            }, status=400)




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
                user = User.objects.get(username=request.user.username)
                user.todo_list_jobs.add(new_job)

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
    item_formset = JobItemFormSet(queryset=JobItem.objects.none(), initial=[{'job':job_id}])
    user_is_watching = my_job.on_todo_list(request.user)

    # Comments stuff
    setting_for_order_by = '-created_on'

    pinned_dict = {}
    pinned_dict['title'] = 'Pinned'
    pinned_dict['class_suffix'] = 'pinned'
    pinned_dict['comments'] = my_job.get_pinned_comments(request.user, setting_for_order_by)

    highlighted_dict = {}
    highlighted_dict['title'] = 'Highlighted'
    highlighted_dict['class_suffix'] = 'highlighted'
    highlighted_dict['comments'] = my_job.get_highlighted_comments(request.user, setting_for_order_by)
    
    comment_data = []
    comment_data.append(pinned_dict)
    comment_data.append(highlighted_dict)

    return render(request, 'adminas/job.html', {
        'job': my_job,
        'po_form': POForm(initial={'job': my_job.id}),
        'item_formset': item_formset,
        'watching': user_is_watching,
        'num_comments': my_job.comments.all().count(),
        'comment_data': comment_data
    })


def job_comments(request, job_id):
    if not request.user.is_authenticated:
        return anonymous_user(request)
    
    if request.method == 'POST':
        # Check if this comment ID is valid and the user is allowed to change it
        comment_id = request.GET.get('id')
        if comment_id != '0': # 0 would mean it's a new comment, so no check is needed (any logged-in user is allowed to create a comment)
            try:
                comment = JobComment.objects.get(id=comment_id)
            except JobComment.DoesNotExist:
                return JsonResponse({
                    'error': "Can't find comment."
                }, status=400)

            if(comment.created_by != request.user):
                return JsonResponse({
                    'denied': "You are not the owner of this comment."
                }, status=403) 

        # Check if the user wants to delete a comment. if so, we have all the info we need, so delete it.
        posted_data = json.loads(request.body)
        if 'task' in posted_data and posted_data['task'] == 'delete':
            comment.delete()
            return JsonResponse({'ok': 'ok'}, status=200)                     

        # If it's create/update, stick the data into the form for cleaning and check it's all ok.
        comment_form = JobCommentFullForm({
            'private': posted_data['private'],
            'contents': posted_data['contents'],
            'pinned': posted_data['pinned'],
            'highlighted': posted_data['highlighted']
        })

        if not comment_form.is_valid():
            debug(comment_form.errors)
            return JsonResponse({
                'error': "Invalid form data."
            }, status=400)   

        else:
            if comment_id == '0':
                # Add new comment
                try:
                    job = Job.objects.get(id=job_id)
                except Job.DoesNotExist:
                    return JsonResponse({
                        'error': "Can't find Job."
                    }, status=400)

                comment = JobComment(
                    created_by = request.user,
                    job = job,
                    contents = comment_form.cleaned_data['contents'],
                    private = comment_form.cleaned_data['private']
                )
                comment.save()

                want_pinned = comment_form.cleaned_data['pinned']
                if want_pinned:
                    comment.pinned_by.add(request.user)
                    comment.save()

                want_highlighted = comment_form.cleaned_data['highlighted']
                if want_highlighted:
                    comment.highlighted_by.add(request.user)
                    comment.save()

            else:
                # Edit the existing comment
                comment.contents = comment_form.cleaned_data['contents']
                comment.private = comment_form.cleaned_data['private']

                user = User.objects.get(username=request.user.username)

                want_pinned = comment_form.cleaned_data['pinned']
                have_pinned = comment.is_pinned_by(user)

                if want_pinned and not have_pinned:
                    comment.pinned_by.add(request.user)
                elif not want_pinned and have_pinned:
                    comment.pinned_by.remove(request.user)

                want_highlighted = comment_form.cleaned_data['highlighted']
                have_highlighted = comment.is_highlighted_by(user)

                if want_highlighted and not have_highlighted:
                    comment.highlighted_by.add(request.user)
                elif not want_highlighted and have_highlighted:
                    comment.highlighted_by.remove(request.user)                

                comment.save()
            
            return JsonResponse({
                'id': comment.id,
                'username': comment.created_by.username,
                'timestamp': formats.date_format(comment.created_on, "DATETIME_FORMAT"),
                'contents': comment.contents,
                'private': comment.private,
                'pinned': want_pinned,
                'highlighted': want_highlighted
            }, status=200)

    my_job = Job.objects.get(id=job_id)

    job = {}
    job['id'] = my_job.id
    job['name'] = my_job.name
    job['flag_alt'] = my_job.country.name
    job['flag_url'] = my_job.country.flag
    job['customer'] = my_job.customer.name if my_job.customer != None else None
    job['agent'] = my_job.agent.name if my_job.agent != None else None
    job['currency'] = my_job.currency
    job['value'] = my_job.total_value_f()

    setting_for_order_by = '-created_on'

    # title is used on the frontend to set the innerHTML of a <h#> tag.
    # class_suffix is used when creating a new comment: use it to allow JS to identify the correct container divs to prepend the new comment div.
    # In the cases below, they are the same except for capitalisation, but they're separate fields in case I wanted to change a title without changing the class name.
    highlighted_dict = {}
    highlighted_dict['title'] = 'Highlighted'
    highlighted_dict['class_suffix'] = 'highlighted'
    highlighted_dict['comments'] = my_job.get_highlighted_comments(request.user, setting_for_order_by)
    
    all_dict = {}
    all_dict['title'] = 'All'
    all_dict['class_suffix'] = 'all-comments'

    # Unpaginated all comments
    #all_dict['comments'] = my_job.get_all_comments(request.user, setting_for_order_by)

    # Paginated all comments
    num_comments_per_page = 10
    requested_page_num = request.GET.get('page')
    if(requested_page_num == None):
        requested_page_num = 1
    paginator = Paginator(my_job.get_all_comments(request.user, setting_for_order_by), num_comments_per_page)
    requested_page = paginator.page(requested_page_num)
    all_dict['comments'] = requested_page.object_list

    comment_data = []
    comment_data.append(highlighted_dict)
    comment_data.append(all_dict)

    pinned = my_job.get_pinned_comments(request.user, setting_for_order_by)

    return render(request, 'adminas/job_comments.html', {
        'job': job,
        'comment_data': comment_data,
        'pinned': pinned,
        'page_data': requested_page
    })

         


def comment_status_toggle(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)   

    if request.method == 'POST':
        if 'id' in request.GET:
            comment_id = request.GET.get('id')
        else:
            return JsonResponse({
                'message': "Comment ID not found."
            }, status=400)            

        try:
            comment = JobComment.objects.get(id=comment_id)
        except JobComment.DoesNotExist:
            return JsonResponse({
                'message': "Can't find the comment."
            }, status=400)
        
        user = User.objects.get(username=request.user.username)
        posted_data = json.loads(request.body)

        if 'toggle' == posted_data['task']:
            want_membership = posted_data['toggle_to']

            if 'pinned' == posted_data['mode']:
                have_membership = comment.is_pinned_by(user)

                if want_membership and not have_membership:
                    comment.pinned_by.add(user)
                elif not want_membership and have_membership:
                    comment.pinned_by.remove(user)

            elif 'highlighted' == posted_data['mode']:
                have_membership = comment.is_highlighted_by(user)

                if want_membership and not have_membership:
                    comment.highlighted_by.add(user)
                elif not want_membership and have_membership:
                    comment.highlighted_by.remove(user)                

            return HttpResponse(status=200)

        else:
            return JsonResponse({
                'message': "Invalid task."
            }, status=400)            










def price_check(request, job_id):
    if not request.user.is_authenticated:
        return anonymous_user(request)

    if request.method == 'POST':
        my_job = Job.objects.get(id=job_id)
        posted_data = json.loads(request.body)
        my_job.price_is_ok = posted_data['new_status']
        my_job.save()

        return JsonResponse({
            'current_status': my_job.price_is_ok
        }, status=200)


        






def purchase_order(request):
# View to handle PO C_UD

    if not request.user.is_authenticated:
        return anonymous_user(request)
    
    if request.method == 'POST':

        # Handle Delete case
        if request.GET.get('delete'):
            po_to_delete = PurchaseOrder.objects.get(id=request.GET.get('id'))
            create_oe_event(request.user, po_to_delete, f'Deleted PO {po_to_delete.reference}', -po_to_delete.value)
            po_to_delete.active = False
            po_to_delete.save()
            job = po_to_delete.job
            job.price_changed()
            return HttpResponseRedirect(reverse('job', kwargs={'job_id': job.pk }))

        else:
            # Create and Update should both submit a JSONed POForm, so handle/check that
            posted_form = POForm(request.POST)
            if posted_form.is_valid():

                # Update PO
                if request.GET.get('id'):
                    po_to_update = PurchaseOrder.objects.get(id=request.GET.get('id'))

                    # Updating a PO can cause 0-2 OE events (to report the difference in value, if any), so prepare for that before changing anything.
                    has_same_currency = po_to_update.currency == posted_form.cleaned_data['currency']
                    if has_same_currency:
                        # Same currency makes it easy to calculate the difference.
                        reason = 'PO amendment altered the value'
                        difference = posted_form.cleaned_data['value'] - po_to_update.value
                    else:
                        # We still need to know the difference, but now currency exchange rates rear their ugly heads.
                        # To avoid "baking in" FX rates to the OE data, we will have two separate OE events.
                        # The first will set the value in the old currency to 0.
                        reason = f"Currency changed from {po_to_update.currency} to {posted_form.cleaned_data['currency']}"
                        create_oe_event(request.user, po_to_update, reason, -po_to_update.value)
                        difference = posted_form.cleaned_data['value']

                    # Update the PO
                    po_to_update.reference = posted_form.cleaned_data['reference']
                    po_to_update.date_on_po = posted_form.cleaned_data['date_on_po']
                    po_to_update.date_received = posted_form.cleaned_data['date_received']
                    po_to_update.currency = posted_form.cleaned_data['currency']
                    po_to_update.value = posted_form.cleaned_data['value']
                    po_to_update.save()

                    # Update OE to reflect changes to the PO, but only if the value changed
                    if difference != 0:
                        create_oe_event(request.user, po_to_update, reason, difference)

                    # Price change = previous price confirmation is no longer valid
                    job = po_to_update.job
                    job.price_changed()

                # Create PO
                else:
                    new_po = PurchaseOrder(
                        created_by = request.user,
                        job = posted_form.cleaned_data['job'],
                        reference = posted_form.cleaned_data['reference'],
                        date_on_po = posted_form.cleaned_data['date_on_po'],
                        date_received = posted_form.cleaned_data['date_received'],
                        currency = posted_form.cleaned_data['currency'],
                        value = posted_form.cleaned_data['value']
                    )
                    new_po.save()
                    create_oe_event(request.user, new_po, 'New PO', new_po.value)

                return HttpResponseRedirect(reverse('job', kwargs={'job_id': posted_form.cleaned_data['job'].id }))

            else:
                debug(posted_form.errors)
                return error_page(request, 'PO form was invalid', 400)







def items(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)
    
    if request.method == 'POST':
        # Try processing the formset with a flexible number of items added at once
        formset = JobItemFormSet(request.POST)
        if formset.is_valid():
            for form in formset:
                add_jobitem(request.user, form)
            return HttpResponseRedirect(reverse('job', kwargs={'job_id': form.cleaned_data['job'].id}))

        # Try processing as a non-formset
        else:
            try:
                posted_data = json.loads(request.body)
            
                if posted_data['source_page'] == 'module_management':
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
                        parent.job.price_changed()
                        
                        return JsonResponse({
                            'id': ji.id
                        }, status=200)
                    else:
                        # There's a problem with the item form dictionary
                        return error_page(request, 'Item form was invalid.', 400)

            # There's something wrong with the data sent over
            except:
                return error_page(request, 'Invalid data.', 400)
      

    elif request.method == 'PUT':
        ji_id = request.GET.get('id')
        ji = JobItem.objects.get(id=ji_id)

        if request.GET.get('delete'):
            ji.job.price_changed()
            ji.delete()
            return JsonResponse({
                'message': 'Deleted record.'
            }, status=200)

        if request.GET.get('edit'):
            put_data = json.loads(request.body)

            if request.GET.get('edit') == 'all':
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

                    ji.job.price_changed()

                    return JsonResponse(ji.get_post_edit_dictionary(), status=200)
            


            if request.GET.get('edit') == 'price_only':
                put_data = json.loads(request.body)
                form = JobItemPriceForm(put_data)

                if form.is_valid():
                    ji.selling_price = form.cleaned_data['selling_price']
                    ji.save()
                    ji.job.price_changed()
                    return JsonResponse(ji.get_post_edit_dictionary(), status=200)
                else:
                    return error_page(request, 'Item has not been updated.', 400)

        else:
            return error_page(request, 'Item has not been updated.', 400)


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
            
            return JsonResponse(req_addr.as_dict(), status=200)












def records(request):
    all_jobs = Job.objects.all().order_by('created_on')
    data = all_jobs.annotate(total_po_value=Sum('po__value')).annotate(num_po=Count('po'))

    for j in data:
        j.total_po_value_f = format_money(j.total_po_value)

    return render(request, 'adminas/records.html', {
        'data': data
    })












def doc_builder(request):
    if not request.user.is_authenticated:
        return anonymous_user(request)

    # Set variables used for both GET and POST.
    # Note about GET parameters:
    #   CREATE (at both end of the process) will pass "job" and "type", since there is no DocumentData record yet.
    #   UPDATE (at both ends of the process) will pass "id" (= the DocumentData PK).
    #   DELETE will pass "id" and "delete=true"
    if request.method == 'DELETE':
        doc_obj = DocumentVersion.objects.get(id=int(request.GET.get('id')))

        if doc_obj.issue_date == None:
            doc_obj.deactivate()
            doc_obj.save()
            return JsonResponse({
                'redirect': reverse('job', kwargs={'job_id': doc_obj.document.job.id})
            })

        else:
            return JsonResponse({
                'message': "FORBIDDEN: documents cannot be deleted after they've been issued, only replaced with a newer version. Delete failed"
            }, status=200)

    elif request.GET.get('id') != None:
        doc_obj = DocumentVersion.objects.get(id=int(request.GET.get('id')))

        if doc_obj.issue_date != None:
            return error_page(request, "Forbidden. You can't edit a document which has already been issued.", 403)

        this_job = doc_obj.document.job
        job_id = this_job.id
        doc_code = doc_obj.document.doc_type
        doc_ref = doc_obj.document.reference
        doc_title = dict(DOCUMENT_TYPES).get(doc_code)

    elif request.GET.get('job') != None:
        doc_obj = None
        job_id = int(request.GET.get('job'))
        this_job = Job.objects.get(id=job_id)
        doc_code = request.GET.get('type')
        doc_ref = ''
        doc_title = f'Create New {dict(DOCUMENT_TYPES).get(doc_code)} for {this_job.name}'

    else:
        return error_page(request, "Can't find document.", 400)


    # Handle adjustments to the database in the event of a POST
    if request.method == 'POST':
        if doc_obj != None and doc_obj.issue_date != None:
            return JsonResponse({
                'message': "Can't edit a document that has already been issued (nice try though)"
            }, status=403)

        else:
            # Get the POST data into forms and check it's ok before proceeding
            # Form common to all doc types.
            posted_data = json.loads(request.body)
            doc_dict = {}
            doc_dict['reference'] = posted_data['reference']
            form = DocumentDataForm(doc_dict)

            version_dict = {}
            version_dict['issue_date'] = posted_data['issue_date']
            version_form = DocumentVersionForm(version_dict)

            # Form specific to a certain document type.
            doctype_specific_fields_exist = False
            doctype_specific_fields_are_ok = True
            if 'req_prod_date' in posted_data:
                doctype_specific_fields_exist = True
                prod_data_form = ProductionReqForm({
                    'date_requested': posted_data['req_prod_date']
                })
                doctype_specific_fields_are_ok = prod_data_form.is_valid()

            # If the inputs are ok, proceed with the database updates.
            if form.is_valid() and version_form.is_valid() and (not doctype_specific_fields_exist or doctype_specific_fields_are_ok):
                response = {}

                if(doc_obj == None):
                    # POST and doc_obj == None means the user is creating a new document. Create it now and save it.
                    parent_doc = DocumentData(
                        reference = form.cleaned_data['reference'],
                        doc_type = doc_code,
                        job = this_job
                    )
                    parent_doc.save()

                    doc_obj = DocumentVersion(
                        created_by = request.user,
                        document = parent_doc,
                        version_number = 1,
                        issue_date = version_form.cleaned_data['issue_date'] if 'issue_date' in version_form.cleaned_data else None,
                        invoice_to = this_job.invoice_to,
                        delivery_to = this_job.delivery_to
                    )
                    doc_obj.save()

                    # If it's a new document, all the assigned_items and special_instructions must also be new and therefore require creation.
                    new_assignments = posted_data['assigned_items']
                    new_special_instructions = posted_data['special_instructions']
                    response['redirect'] = f"{reverse('doc_builder')}?id={doc_obj.id}"

                else:
                    # POST and doc_id != None means the user is updating an existing document.
                    parent = doc_obj.document
                    parent.reference = form.cleaned_data['reference']
                    parent.doc_type = doc_code
                    parent.job = this_job
                    parent.save()

                    doc_obj.issue_date = version_form.cleaned_data['issue_date']
                    doc_obj.invoice_to = this_job.invoice_to
                    doc_obj.delivery_to = this_job.delivery_to
                    doc_obj.save()

                    # If it's an existing document, assigned_items and special_instructions will need a mixture of creation, updating and/or deletion.
                    # Handle update and delete here. Create is also needed for new documents, so we'll handle that outside this if statement.
                    new_assignments = doc_obj.update_item_assignments_and_get_create_list(posted_data['assigned_items'])
                    new_special_instructions = doc_obj.update_special_instructions_and_get_create_list(posted_data['special_instructions'])
                    response['message'] = 'Document saved'

                # Create new JobItem assignments and special instructions.
                for jobitem in new_assignments:
                    assignment = DocAssignment(
                        version = doc_obj,
                        item = JobItem.objects.get(id=jobitem['id']),
                        quantity = int(jobitem['quantity'])
                    )
                    assignment.quantity = min(assignment.quantity, assignment.max_quantity_excl_self())
                    assignment.save()

                for spec_instr in new_special_instructions:
                    instr = SpecialInstruction(
                        version = doc_obj,
                        instruction = spec_instr['contents'],
                        created_by = request.user
                    )
                    instr.save()

                # Update/delete document-specific fields. For now, that's only the WO requested date.
                if 'req_prod_date' in posted_data:
                    doc_obj.update_requested_production_date(prod_data_form)

                if doc_obj.issue_date != None:
                    return JsonResponse({
                        'redirect': reverse('doc_main', kwargs={'doc_id': doc_obj.id})
                    })

                else:
                    return JsonResponse(response, status=200)

            else:
                debug(form.errors)
                debug(version_form.errors)
                debug(prod_data_form.errors)
                return JsonResponse({
                    'message': 'Invalid data.'
                }, status=500)   
    

    # doc_obj will only == None at this stage if this is a GET request for a "blank" new document, since POST>CREATE will have created a doc_obj by now.
    doc_specific_obj = None
    if doc_obj != None:
        included_list = doc_obj.get_included_items()
        excluded_list = doc_obj.get_excluded_items()
        special_instructions = doc_obj.instructions.all().order_by('-created_on')
        version_num = doc_obj.version_number

        # Check for doc_specific fields.
        if doc_obj.document.doc_type == 'WO':
            try:
                doc_specific_obj = ProductionData.objects.filter(document=doc_obj)[0]
            except:
                pass

    else:
        # Make a temporary doc_obj to pass data to render and obtain access to useful methods.
        included_list = this_job.get_default_included_items(doc_code)
        excluded_list = this_job.get_default_excluded_items(doc_code)
        special_instructions = None
        version_num = 1


    return render(request, 'adminas/document_builder.html', {
        'doc_title': doc_title,
        'doc_id': doc_obj.id if doc_obj != None else 0,
        'doc': doc_obj,
        'version_number': version_num,
        'doc_type': doc_code,
        'reference': doc_ref,
        'job_id': job_id,
        'doc_specific': doc_specific_obj,
        'included_items': included_list,
        'excluded_items': excluded_list,
        'special_instructions': special_instructions
    })






def document_pdf(request, doc_id):
    if not request.user.is_authenticated:
        return anonymous_user(request)

    my_doc = DocumentVersion.objects.get(id=doc_id)
    context = my_doc.get_display_data_dict()
    template_body = f'adminas/pdf_doc_{my_doc.document.doc_type.lower()}_body.html'
    template_header = f'adminas/pdf_doc_{my_doc.document.doc_type.lower()}_header.html'
    template_footer = f'adminas/pdf_doc_{my_doc.document.doc_type.lower()}_footer.html'

    if my_doc.document.doc_type == 'OC':
        margin_top_setting = 150
    elif my_doc.document.doc_type == 'WO':
        margin_top_setting = 120

    response = PDFTemplateResponse(request=request,
                                    template=template_body,
                                    filename=f"{my_doc.document.doc_type} {my_doc.document.reference}.pdf",
                                    header_template = template_header,
                                    footer_template = template_footer,
                                    context= context,
                                    show_content_in_browser=True,
                                    cmd_options={'margin-top': margin_top_setting, # started off at 10
                                            "zoom":1,
                                            'quiet': None, # Added to try to resolve CalledProcessError (2)
                                            'enable-local-file-access': True}, # Added to try to resolve CalledProcessError (1)
                                )
    return response
   


def document_main(request, doc_id):
    if not request.user.is_authenticated:
        return anonymous_user(request)

    if request.method == 'POST':
        posted_data = json.loads(request.body)

        try:
            this_version = DocumentVersion.objects.get(id=doc_id)
        except:
            return JsonResponse({
                'message': "Error: Can't find original document version"
            }, status=500)

        if posted_data['task'] == 'replace':
            try:
                new_version = this_version.get_replacement_version(request.user)
                return JsonResponse({
                    'redirect': f'{reverse("doc_builder")}?id={new_version.pk}'
                })

            except:
                return JsonResponse({
                    'message': 'Replacement failed'
                }, status=500)

        elif posted_data['task'] == 'revert':
            previous_version = this_version.revert_to_previous_version()

            if previous_version == None:
                return JsonResponse({
                    'message': 'Cannot revert to previous version: some items have been assigned to other documents of the same type.'
                }, status=405)

            else:
                # While we're /generally/ deactivating document versions instead of .delete()ing them, it'd be nice if misclicks didn't result in
                # loads of deactivated documents that nobody ever wanted.
                # If the user clicks to revert on the same day as the new version was created, we'll assume it was a misclick.
                if this_version.created_on.date() == datetime.date.today():
                    this_version.delete()

                return JsonResponse({
                    'redirect': reverse('doc_main', kwargs={'doc_id': previous_version.pk})
                }, status=200)



    try:
        doc_obj = DocumentVersion.objects.get(id=doc_id)
    except:
        return error_page(request, "Can't find document.", 400) 

    doc_title = dict(DOCUMENT_TYPES).get(doc_obj.document.doc_type)

    doc_specific_obj = None
    if doc_obj.document.doc_type == 'WO':
        try:
            doc_specific_obj = ProductionData.objects.filter(version=doc_obj)[0]
        except:
            pass

    return render(request, 'adminas/document_main.html', {
        'doc_title': doc_title,
        'doc_id': doc_id,
        'doc_version': doc_obj,
        'doc_specific': doc_specific_obj,
        'special_instructions': doc_obj.instructions.all().order_by('-created_on')
    })








def status(request):
    return render(request, 'adminas/status.html')





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
