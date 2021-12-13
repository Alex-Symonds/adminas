from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login', views.login_view, name='login'),
    path('register', views.register, name='register'),
    path('logout', views.logout_view, name='logout'),
    path('edit_job', views.edit_job, name='edit_job'),
    path('job/<int:job_id>', views.job, name='job'),
    path('records', views.records, name='records'),
    path('purchase_order', views.purchase_order, name='purchase_order'),
    path('items', views.items, name='items'),
    path('job/<int:job_id>/manage_modules', views.manage_modules, name='manage_modules'),
    path('job/module_assignments', views.module_assignments, name='module_assignments'),
    path('document/builder', views.doc_builder, name='doc_builder'),
    path('document/<int:doc_id>/pdf', views.document_pdf, name='doc_display'),
    path('document/<int:doc_id>', views.document_main, name='doc_main'),
    path('job/<int:job_id>/price_check', views.price_check, name='price_check'),
    path('todo_list', views.todo_list_management, name='todo_list_management'),
    path('job/<int:job_id>/comments', views.job_comments, name='job_comments'),
    path('comment_status', views.comment_status_toggle, name='comment_status'),
    path('get_data', views.get_data, name='get_data')
]