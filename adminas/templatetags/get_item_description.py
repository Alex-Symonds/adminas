from django import template
from adminas.models import Product

register = template.Library()

@register.simple_tag
def get_item_description(product, language):
    return product.get_description(language)