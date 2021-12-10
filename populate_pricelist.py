import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project5.settings")
import django
django.setup()

import sys
from decimal import *

from adminas.models import Price, Product, PriceList
from adminas.constants import SUPPORTED_CURRENCIES

def main():
    """ 
        Create a set of Price records for the latest PriceList.
        
        Usage:
            python populate_pricelist.py {optional: percentage_increase as decimal}

        Details:
            It will attempt to set Price.value to the previous price for this product & currency, but with the specified percentage increase applied.
            i.e. a percentage_increase of 0 would result in values being copied from the previous price list.
            Absence of a percentage_increase argument means all Price.values are set to 0, allowing for 100% manual entry via Django admin.
    """

    # Get the latest price list object and check it's suitable
    price_list = get_latest_price_list_obj()
    if price_list == None:
        print('Failed: price list was not found. (You must create a price list in Django admin before populating it.)')
        return

    prices_on_price_list = Price.objects.filter(price_list=price_list)
    if prices_on_price_list.count() > 0:
        print(f'Failed: prices already exist for the latest price list ({price_list.name}).')
        print(f'Either: \n\t1) Create a new price list in Django admin;\n\t2) Delete all existing prices from "{price_list.name}" via Django admin')
        return

    # Check if the user entered a percentage_increase
    if len(sys.argv) > 1:
        try:
            percentage_increase_as_decimal = Decimal(sys.argv[1]) / 100
        except InvalidOperation:
            print('Error: optional argument must be a number. Giving up.')
            return

        multiplier = 1 + percentage_increase_as_decimal
        
    else:
        multiplier = 0

    assign_new_prices(price_list, multiplier)
    print(f'Complete: price list "{price_list.name}" has been populated.')
    return


def get_latest_price_list_obj():
    """
        PriceList object with the most recent valid_from date.
    """
    price_lists = PriceList.objects.all()

    if price_lists.count() > 0:
        return price_lists.order_by('-valid_from')[0]
        
    return None


def get_previous_price_list_obj(this_price_list):
    """
        PriceList object with the most recent valid_from date before the valid_from date of the argument PriceList object
    """
    previous_price_lists = PriceList.objects.exclude(id=this_price_list.id).filter(valid_from__lte = this_price_list.valid_from)

    if previous_price_lists.count() > 0:
        return previous_price_lists.order_by('-valid_from')[0]

    return None


def assign_new_prices(this_pl, multiplier):
    """
        Create a set of Prices for a given price list.
    """
    prev_pl = get_previous_price_list_obj(this_pl)
    notes = ''

    for prd in Product.objects.filter(available=True):
        for curr in SUPPORTED_CURRENCIES:

            # Work out the new value
            # Handle "no previous price list exists"
            if prev_pl == None:
                new_value = 0
                notes = 'Note: this is the first price list, so all prices have been set to 0.'

            else:
                prev_price_qs = Price.objects.filter(price_list=prev_pl).filter(currency=curr[0]).filter(product=prd)

                # Handle "no previous price exists for this specific product and currency combo"
                if prev_price_qs.count() == 0:
                    new_value = 0
                    if notes == '':
                        notes = f'Note: Any products without a price in "{prev_price_qs.name}" have been priced at 0.'

                # Handle "everything exists: let's apply the multiplier as planned. \o/"
                else:
                    prev_price_obj = prev_price_qs[0]
                    new_value = prev_price_obj.value * multiplier

            new_price_obj = Price(
                price_list = this_pl,
                product = prd,
                currency = curr[0],
                value = new_value
            )
            new_price_obj.save()

    if notes != '':
        print(notes)
    
    return


main()