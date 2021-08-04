from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect
from django.db import IntegrityError
from django.urls import reverse
from django.contrib.auth.decorators import login_required
import json
from django.http import JsonResponse

from adminas.models import User, Job, PurchaseOrder
from adminas.forms import JobForm, JobItemFormSet, PoFormSet

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
    default_get = '-'

    if request.method == 'GET':
        job_id = request.GET.get('job', default_get)

        if job_id == default_get:
            job_form = JobForm()
            item_form = JobItemFormSet()
            po_form = PoFormSet()
            return render(request, 'adminas/edit.html',{
                'job_form': job_form,
                'item_row': item_form,
                'po_row': po_form
            })
        else:
            pass
            # load the formy page with inputs pre-populated with existing order data
    else:
        pass
        # Save the data in the database
    
    return render(request, 'adminas/edit.html')

def job(request, job_id):
    return render(request, 'adminas/job.html')

def active(request):
    return render(request, 'adminas/active.html')

def records(request):
    return render(request, 'adminas/records.html')

def data(request):
    return render(request, 'adminas/data.html')

def memos(request):
    return render(request, 'adminas/memos.html')