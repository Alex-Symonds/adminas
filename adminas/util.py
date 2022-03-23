from django.shortcuts import render
import adminas.models
from adminas.constants import ERROR_NO_DATA
from adminas.constants import DOCUMENT_TYPES


def format_money(value):
    if value == None:
        return ERROR_NO_DATA
    try:
        return f'{value:,.2f}'
    except:
        return value


def get_plus_prefix(value):
    if value > 0:
        return '+'
    else:
        return ''


def anonymous_user(request):
    return error_page(request, 'You must be logged in to view this page.', 401)


def error_page(request, message, error_code):
    return render(request, 'adminas/error.html', {
        'message': message
    }, status=error_code)
    

def add_jobitem(admin_user, form):
    """
        Add one JobItem, based on a validated form.
    """
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


def debug(print_this):
    print("------------- here comes something you're checking on! --------------------")
    print(print_this)
    print('---------------------------------------------------------------------------')


def get_document_available_items(jobitems, doc_type):
    """
        List of items assigned to a Job which have not yet been assigned to a document of this type.
        On a new document, the assumption is that the user is creating the new document to cover the leftover items, 
        so this is used to populate the default "included" list.
        On an existing document, the user has already indicated which items they wish to include, so this is used to 
        populate the top of the "excluded" list.
    """
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
                this_dict['total_quantity'] = poss_item.quantity
                this_dict['display'] = poss_item.display_str().replace(str(poss_item.quantity), str(qty))
                this_dict['is_available'] = True
                result.append(this_dict)    


        if len(result) == 0:
            return None
        else:
            return result


def copy_relations_to_new_document_version(existing_relations, new_version):
    """
        Support for replacement documents. Go through a set of relations making copies, assigning a new 
        PK to the copy, then replacing the version FK.
    """
    for record in existing_relations:
        r = record
        r.pk = None
        r.version = new_version
        r.save()
    return




def get_dict_document_builder(**kwargs):
    result = {}
    if 'doc_id' in kwargs:
        try:
            doc_obj = adminas.models.DocumentVersion.objects.get(id=kwargs.get('doc_id', 0))
        except adminas.models.DocumentVersion.DoesNotExist:
            result['error_msg'] = "Can't find document version."
            result['http_code'] = 404
            return result
        
        if doc_obj.issue_date != None:
            result['error_msg'] = "Forbidden: documents which have been issued cannot be updated."
            result['http_code'] = 403
            return result

        result['doc_obj'] = doc_obj
        result['job_obj'] = doc_obj.document.job
        result['job_id'] = doc_obj.document.job.id
        result['doc_code'] = doc_obj.document.doc_type
        result['doc_ref'] = doc_obj.document.reference
        result['doc_title'] = dict(DOCUMENT_TYPES).get(result['doc_code'])
        return result

    elif 'job_id' in kwargs and 'doc_code' in kwargs:
        # Prepare variables for new documents (used by POST+CREATE and GET+NEW)
        try:
            this_job = adminas.models.Job.objects.get(id=kwargs.get('job_id', "?"))
        except adminas.models.Job.DoesNotExist:
            result['error_msg'] = "Can't find job."
            result['http_code'] = 404
            return result

        result['doc_obj'] = None
        result['job_obj'] = this_job
        result['job_id'] = this_job.id
        result['doc_code'] = kwargs.get('doc_code', "?")
        result['doc_ref'] = ''
        result['doc_title'] = f"Create New {dict(DOCUMENT_TYPES).get(result['doc_code'])}"
        return result

def create_document_assignments(jobitems, doc_obj):
    for jobitem in jobitems:
        assignment = adminas.models.DocAssignment(
            version = doc_obj,
            item = adminas.models.JobItem.objects.get(id=jobitem['id']),
            quantity = int(jobitem['quantity'])
        )
        assignment.quantity = min(assignment.quantity, assignment.max_quantity_excl_self())
        assignment.save()

def create_document_instructions(new_special_instructions, doc_obj, user):
    for spec_instr in new_special_instructions:
        instr = adminas.models.SpecialInstruction(
            version = doc_obj,
            instruction = spec_instr['contents'],
            created_by = user
        )
        instr.save()