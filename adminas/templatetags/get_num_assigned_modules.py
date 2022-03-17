from django import template

register = template.Library()

@register.simple_tag
def get_num_assigned_modules(jobitem, slot):
    return jobitem.num_slot_children(slot)