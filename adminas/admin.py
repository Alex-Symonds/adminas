from django.contrib import admin

# Register your models here.
from .models import User, Job, Company, Site, Address

# Register your models here.
admin.site.register(User)
admin.site.register(Job)
admin.site.register(Company)
admin.site.register(Site)
admin.site.register(Address)
