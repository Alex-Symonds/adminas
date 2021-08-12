from django.shortcuts import render

def format_money(value):
    return f'{value:,.2f}'

def anonymous_user(request):
    error_page(request, 'You must be logged in to view this page.', 401)

def error_page(request, message, error_code):
    return render(request, 'adminas/error.html', {
        'message': message
    }, status=error_code)
    
