from django import template

register = template.Library()

@register.simple_tag
def get_slot_details_string_required(jobitem, slot):
    return jobitem.get_slot_details_string_required(slot)

@register.simple_tag
def get_slot_details_string_optional(jobitem, slot):
    return jobitem.get_slot_details_string_optional(slot)

@register.simple_tag
def get_num_excess(jobitem, slot):
    return jobitem.get_num_excess(slot)

