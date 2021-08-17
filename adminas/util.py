from django.shortcuts import render

def format_money(value):
    return f'{value:,.2f}'

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
    
