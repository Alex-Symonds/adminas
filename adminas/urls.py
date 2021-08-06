from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login', views.login_view, name='login'),
    path('register', views.register, name='register'),
    path('logout', views.logout_view, name='logout'),
    path('edit_job', views.edit_job, name='edit_job'),
    path('job/<int:job_id>', views.job, name='job'),
    path('status', views.status, name='status'),
    path('records', views.records, name='records'),
    path('memos', views.memos, name='memos')
]