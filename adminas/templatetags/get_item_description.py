from django import template

register = template.Library()

@register.simple_tag
def get_item_description(product, language):
    return product.get_description(language)