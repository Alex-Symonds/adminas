from django.shortcuts import render
import adminas.models
import json
from django.http import JsonResponse, HttpResponse



def format_money(value):
    try:
        return f'{value:,.2f}'
    except:
        return value

def get_plusminus_prefix(value):
    if value > 0:
        return '+'
    #elif value < 0:
    #    return '-'
    else:
        return ''

def anonymous_user(request):
    return error_page(request, 'You must be logged in to view this page.', 401)

def error_page(request, message, error_code):
    return render(request, 'adminas/error.html', {
        'message': message
    }, status=error_code)
    
def add_jobitem(admin_user, form):
    ji = adminas.models.JobItem(
        created_by = admin_user,
        job = form.cleaned_data['job'],
        product = form.cleaned_data['product'],
        price_list = form.cleaned_data['price_list'],
        quantity = form.cleaned_data['quantity'],
        selling_price = form.cleaned_data['selling_price']
    )
    ji.save()
    ji.add_standard_accessories()

    return ji



def create_oe_event(admin_user, po, reason, value):
    oe_event = adminas.models.AccEventOE(
        created_by = admin_user,
        currency = po.currency,
        value = value,
        job = po.job,
        po = po,
        reason = reason
    )
    oe_event.save()

    return oe_event


def debug(print_this):
    print("------------- here comes something you're checking on! --------------------")
    print(print_this)
    print('---------------------------------------------------------------------------')




def get_document_available_items(jobitems, doc_type):
    # List of items assigned to a Job which have not yet been assigned to a document of this type.
    # On a new document, the assumption is that the user is creating the new document to cover the leftover items, so this is used to populate the default "included" list.
    # On an existing document, the user has already indicated which items they wish to include, so this is used to populate the top of the "excluded" list.

    if jobitems == None or jobitems.count() == 0:
        return None

    else:
        result = []
        for poss_item in jobitems:
            qty = poss_item.quantity

            assignments = adminas.models.DocAssignment.objects.filter(item=poss_item).filter(version__document__doc_type=doc_type).filter(version__active=True)
            for assignment in assignments:
                qty = qty - assignment.quantity

            if qty > 0:
                this_dict = {}
                this_dict['jiid'] = poss_item.pk
                this_dict['display'] = poss_item.display_str().replace(str(poss_item.quantity), str(qty))
                this_dict['is_available'] = True
                result.append(this_dict)    


        if len(result) == 0:
            return None
        else:
            return result


def copy_relations_to_new_document_version(existing_relations, new_version):
    for record in existing_relations:
        r = record
        r.pk = None
        r.version = new_version
        r.save()
    return

def get_empty_comment_section_dict(message):
    d = {}
    d['type'] = 'message'
    d['message'] = message
    return d

