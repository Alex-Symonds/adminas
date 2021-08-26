from django import template

register = template.Library()

@register.simple_tag
def get_valid_jobitems_for_slot(slot, parent_jobitem):
    return slot.valid_jobitems(parent_jobitem)