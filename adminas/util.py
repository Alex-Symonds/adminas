from django.shortcuts import render
import adminas.models

def format_money(value):
    try:
        return f'{value:,.2f}'
    except:
        return value

def get_plusminus_prefix(value):
    if value > 0:
        return '+'
    else:
        return ''
    #elif value < 0:
    #    return '-'

def anonymous_user(request):
    error_page(request, 'You must be logged in to view this page.', 401)

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
