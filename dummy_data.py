import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project5.settings")
import django
django.setup()

from adminas.models import User, Company, Site, Address, Product, Price, PriceList, Description, Slot, SlotChoiceList, StandardAccessory, Job, JobItem, ResaleCategory

import datetime
import random
from adminas.constants import GBP, EUR, USD, EN, DE

NEED_ADDRESSES = True
NEED_PRODUCTS = True
NEED_CHOICE_LISTS = True
NEED_SLOTS = True
NEED_STDACCS = True
NEED_DESCS_ONLY = False
NEED_JOBS = True

ADMIN = User.objects.all()[0]

task_total = 6

def main():
    task_num = 1
    task_num = print_progress('addresses', task_num)
    populate_addresses()
    task_num = print_progress('products, descriptions and price lists (this is a big one)', task_num)
    populate_products()
    task_num = print_progress('slot options', task_num)
    populate_choice_lists()
    task_num = print_progress('slot settings', task_num)
    populate_slots()
    task_num = print_progress('standard accessories', task_num)
    populate_std_accs()
    task_num = print_progress('demo job', task_num)
    populate_jobs()
    print('All dummy data is loaded.')


def print_progress(thing_loading, task_num):
    print(f'{task_num}/{task_total}: Loading {thing_loading}...')
    task_num += 1
    return task_num


def populate_jobs():
    if Job.objects.all().count() > 0:
        return

    agent = Company.objects.filter(is_agent=True)[0]
    customer = Company.objects.filter(is_agent=False)[0]

    delivery_addr = Address.objects.filter(site__company=customer).filter(site__default_delivery=True)[0]
    if delivery_addr == None:
        delivery_addr = Address.objects.filter(site__company=customer)[0]

    invoice_addr = Address.objects.filter(site__company=agent).filter(site__default_invoice=True)[0]
    if invoice_addr == None:
        invoice_addr = Address.objects.filter(site__company=agent)[0]
    
    job = Job(
        created_by = ADMIN,
        name = '2108-001',
        agent = agent,
        customer = customer,
        country = 'GB',
        language = 'EN',
        invoice_to = invoice_addr,
        delivery_to = delivery_addr,
        currency = 'GBP',
        quote_ref = 'Q210712KP-1',
        payment_terms = '30 days from date of invoice',
        incoterm_code = 'CPT',
        incoterm_location = 'UK'
    )
    job.save()

    ji = JobItem(
        created_by = ADMIN,
        job = job,
        quantity = 1,
        price_list = PriceList.objects.all()[0],
        product = Product.objects.get(name='Trap door (volcano pack)'),
        selling_price = 50000.00
    )
    ji.save()

    ji.pk = None
    ji.product = Product.objects.get(name='Treasure tester')
    ji.selling_price = 75000
    ji.save()



def populate_descs_only():
    data = products_data()
    old_date = datetime.datetime(2020, 12, 15, 13, 45, 12, 000000)

    for d in data:
        p = Product.objects.get(name=d[1])
        add_set_of_desc(p, old_date, d[4])

    print('Descs added')
    return


def populate_std_accs():

    # Avoid adding StandardAccessories twice.
    if StandardAccessory.objects.all().count() > 0:
        return


    stdacc_data = []
    stdacc_data.append(['Treasure tester', [
                                                    [1, 'Dust cover (treasure tester)'], 
                                                    [1, 'Power cord and adaptor']
                                            ]
                        ])
    stdacc_data.append(['Control room package', [
                                                    [1, 'Trap door (volcano pack)'],
                                                    [1, 'Conference table'],
                                                    [1, 'Overlord desk'],
                                                    [1, 'LCD Screens'],
                                                    [4, 'Wall control panel'],
                                                    [10, 'Uniform (Volcano)']
                                                ]
                        ])
    stdacc_data.append(['Trap door (volcano pack)', [
                                                    [1, 'Lava pit'],
                                                    [1, 'Match hatch'],
                                                    [1, 'Activation button'],
                                                    [1, 'Activation app'],
                                                    [1, 'Basic escape'],
                                                    [1, 'Chair trapdoor']
                                                ]
                        ])
    stdacc_data.append(['Doomsday Device (1B+)', [
                                                    [1, 'Dust cover (doomsday)'],
                                                    [1, 'Power cord and adaptor']
                                                ]
                        ])
    
    for parent in stdacc_data:
        p = Product.objects.get(name=parent[0])

        for accessory in parent[1]:
            a = Product.objects.get(name=accessory[1])
            stdAcc = StandardAccessory(
                created_by = ADMIN,
                parent = p,
                accessory = a,
                quantity = accessory[0]
            )
            stdAcc.save()

    return




def populate_slots():
    if Slot.objects.all().count() > 0:
        return

    #parent (fk), name (Char), quantity (Int), is_required (Bool), choices (fk)
    trapdoor = Product.objects.get(name='Trapdoor (BYO)')
    tester = Product.objects.get(name='Treasure tester')

    slots_data = []
    slots_data.append([trapdoor, 'Pit', 1, 0, 'Pits'])
    slots_data.append([trapdoor, 'Hatch', 1, 0, 'Hatches'])
    slots_data.append([trapdoor, 'Activation Method', 1, 4, 'Activators'])
    slots_data.append([trapdoor, 'Escape Route', 1, 3, 'Escapes'])
    slots_data.append([trapdoor, 'Special Options', 0, 2, 'Trapdoor Specials'])

    slots_data.append([tester, 'Test Unit', 1, 2, 'Test units'])

    for sd in slots_data:
        mySlot = Slot(
            parent = sd[0],
            name = sd[1],
            quantity_required = sd[2],
            quantity_optional = sd[3],
            choice_group = SlotChoiceList.objects.get(name=sd[4])
        )
        mySlot.save()
    
    return


def populate_choice_lists():
    if SlotChoiceList.objects.all().count() > 0:
        return

    choiceLists = []
    # Trapdoor BYO options
    choiceLists.append(['Pits', 'Lava pit', 'Shark tank', 'Crush room', 'Plain pit', 'Animal pit', 'Furnace pit'])
    choiceLists.append(['Hatches', 'Plain hatch', 'Match hatch', 'Invisible hatch'])
    choiceLists.append(['Activators', 'Activation button', 'Activation app', 'Activation cord', 'Activation remote', 'Activation within system'])
    choiceLists.append(['Escapes', 'Basic escape', 'Puzzle escape (runes)', 'Puzzle escape (arithmetic)', 'Puzzle escape (s/w)'])
    choiceLists.append(['Trapdoor Specials', 'Spiked walls', 'Chair trapdoor'])
    # Treasure tester units
    choiceLists.append(['Test units', 'Gold test unit', 'Sacrifice test unit', 'Currency test unit'])

    for l in choiceLists:
        scl = SlotChoiceList(name=l[0])
        scl.save()
        for c in l[1:]:
            try:
                scl.choices.add(Product.objects.get(name=c))
            except:
                print(f"{c} didn't work")

    return



def populate_products():
    if Product.objects.all().count() > 0:
        return

    # Obtain data entered about products
    products = products_data()
    populate_resale_categories()

    # Setup two price lists
    prl = PriceList(created_by = ADMIN, valid_from = datetime.datetime.today(), name = 'PRL 2021.7.1')
    prl.save()

    old_date = datetime.datetime(2020, 12, 15, 13, 45, 12, 000000)
    oldprl = PriceList(created_by = ADMIN, valid_from = old_date, name = 'PRL 2020.12.3')
    oldprl.save()

    countries = ['GB', 'US', 'NZ', 'AU', 'CA', 'DE', 'FR', 'CN']
    max_part_no = int('9' * 8)

#products.append(['CT', 'Trapdoor (BYO)', '76109010', 'Trapdoor mechanism', 100000.00, 'Standard'])
    for e in products:
        part_no = f'{e[0]}{random.randint(0, max_part_no):08}'
        origin = countries[random.randint(0, len(countries)-1)]

        p = Product(
            created_by = ADMIN,
            available = True,
            name = e[1],
            part_number = part_no,
            origin_country = origin,
            resale_category = ResaleCategory.objects.get(name=e[4])
         )
        p.save()

        add_set_of_desc(p, e[2])
        add_set_of_prices(p, prl, oldprl, e[3])
    return
    


def add_set_of_desc(p, desc):
    # Add "DE" version first
    d = Description(
        created_by = ADMIN,
        product = p,
        language = DE,
        description = f'[TRANSLATE: DE] {desc}'
    )
    d.save()

    # Make a copy, amend to "EN". This is the first one, so it's the "oldest" EN version
    d.pk = None
    d.language = EN
    d.description = f'Ye Olde {desc}'
    d.save()

    # Make another copy. This will be the second, "latest" EN version
    d.pk = None
    d.description = desc
    d.save()

    return


def add_set_of_prices(p, prl, oldprl, val):

    pr = Price(
        price_list = prl,
        product = p,
        currency = GBP,
        value = val
    )
    pr.save()
    add_other_currencies(pr)

    pr.pk = None
    pr.currency = GBP
    pr.price_list = oldprl
    pr.value = round(val/1.05, 0)   #format(val/1.05, ".0f")
    pr.save()
    add_other_currencies(pr)

    return

def add_other_currencies(gbp_price_obj):
    val = gbp_price_obj.value

    gbp_price_obj.pk = None
    gbp_price_obj.currency = USD
    gbp_price_obj.value = round(val * 1.38, 0)
    gbp_price_obj.save()

    gbp_price_obj.pk = None
    gbp_price_obj.currency = EUR
    gbp_price_obj.value = round(val * 1.18, 0)
    gbp_price_obj.save()

    return 


def populate_resale_categories():
    categories = [
        {'name': 'Standard', 'resale': 25},
        {'name': 'Weapons', 'resale': 35},
        {'name': 'Apparel', 'resale': 20}
    ]

    for cat in categories:
        c = ResaleCategory(
            created_by = ADMIN,
            name = cat['name'],
            resale_perc = cat['resale']
        )
        c.save()


def products_data():
    products = []
    products.append(['CT', 'Trapdoor (BYO)', 'Trapdoor mechanism', 100000.00, 'Standard'])
    products.append(['CT', 'Lava pit',  'Deep pit (d = 9 metres), supplied with lava (d = 3 metres)', 500000.00, 'Standard'])
    products.append(['CT', 'Shark tank', 'Open-topped aquarium, suitable for up to 7 sharks (sharks not included)', 300000.00, 'Standard'])
    products.append(['CT', 'Crush room', 'Rectangular basement with mechanised adjustable walls', 200000.00, 'Standard'])
    products.append(['CT', 'Plain pit', 'Basement, 9 metre depth', 55000.00, 'Standard'])
    products.append(['CT', 'Animal pit', 'Basement animal enclosure with LED ceiling to simulate daylight and full ventilation', 155000.00, 'Standard'])
    products.append(['CT', 'Furnace pit', 'Underground furnace, gas connection and ventilation included', 250000.00, 'Standard'])
    products.append(['DR', 'Plain hatch', 'Plain metal covering', 250.00, 'Standard'])
    products.append(['DR', 'Match hatch', 'Match floor surface (a gap around the edges will be clearly visible)', 1000.00, 'Standard'])
    products.append(['DR', 'Invisible hatch', 'Match floor surface (gap around the edge is imperceptible to the human eye', 50000.00, 'Standard'])
    products.append(['AT', 'Activation button', 'Activation button installed in your desk (wired connection)', 500.00, 'Standard'])
    products.append(['AT', 'Activation app', 'Smartphone app (iOS, Android)', 1000.00, 'Standard'])
    products.append(['AT', 'Activation cord', 'Activation pull cord', 500.00, 'Standard'])
    products.append(['AT', 'Activation remote', 'Remote control', 2000.00, 'Standard'])
    products.append(['AT', 'Activation within system', 'Full integration with your existing system (labour not included, hourly rate)', 200000.00, 'Standard'])
    products.append(['ES', 'Basic escape', 'Escape tunnel (minimum to meet legal requirements)', 50000.00, 'Standard'])
    products.append(['ES', 'Puzzle escape (runes)', 'Escape tunnel unlocked by a puzzle involving runes on large stone slabs', 150000.00, 'Standard'])
    products.append(['ES', 'Puzzle escape (arithmetic)', 'Escape tunnel unlocked by a puzzle involving arthithmetic', 115000.00, 'Standard'])
    products.append(['ES', 'Puzzle escape (s/w)', 'Escape tunnel unlocked by supplying a key word of your choice', 130000.00, 'Standard'])
    products.append(['SP', 'Spiked walls', 'Spikes, angled upwards, along all internal walls (note: victims may climb these to escape)', 100000.00, 'Standard'])
    products.append(['SP', 'Chair trapdoor', 'Integration with conference table: one trapdoor under each seat', 300000.00, 'Standard'])
    products.append(['TC', 'LCD Screens', 'Wall-mounted LCD screens', 150000.00, 'Standard'])
    products.append(['TR', 'Golf cart', 'Golf cart, for rapid transit of employees', 10000.00, 'Standard'])
    products.append(['CL', 'Uniform (Volcano)', 'Uniform, inspired by the might of a volcano', 300.00, 'Apparel'])
    products.append(['CL', 'Uniform (Island)', 'Uniform, suitable for a tropical island', 180.00, 'Apparel'])
    products.append(['CL', 'Uniform (Business)', 'Uniform, blends in with the Western business world', 300.00, 'Apparel'])
    products.append(['CL', 'Uniform (Armoured)', 'Full body armour, including face-obscuring helmet', 1000.00, 'Apparel'])
    products.append(['TR', 'Magnet train system', 'Magnet train transport system for your base', 2000000.00, 'Standard'])
    products.append(['WP', 'Doom Ray (1)', 'Hand-held doom ray', 15000000.00, 'Weapons'])
    products.append(['WP', 'Doom Ray (150)', 'Doom ray capable of destroying a village', 10000000.00, 'Weapons'])
    products.append(['WP', 'Doom Ray (10K)', 'Doom ray capable of destroying a town', 50000000.00, 'Weapons'])
    products.append(['WP', 'Doom Ray (300K)', 'Doom ray capable of destroying a small city', 300000000.00, 'Weapons'])
    products.append(['WP', 'Doom Ray (1M+)', 'Doom ray capable of destroying a large city', 1000000000.00, 'Weapons'])
    products.append(['WP', 'Doomsday Device (1B+)', 'Doom ray capable of destroying a country', 30000000000.00, 'Weapons'])
    products.append(['LB', 'Treasure tester', 'Laboratory device capable of testing treasure', 150000.00, 'Standard'])
    products.append(['AC', 'Dust cover (treasure tester)', 'Dust cover to fit treasure tester', 100.00, 'Standard'])
    products.append(['AC', 'Dust cover (doomsday)', 'Dust cover to fit doomsday device', 500.00, 'Standard'])
    products.append(['AC', 'Power cord and adaptor', 'Power cord and international adaptor', 20.00, 'Standard'])
    products.append(['LB', 'Gold test unit', 'Test module to check purity of gold', 3000.00, 'Standard'])
    products.append(['LB', 'Sacrifice test unit', 'Test module to check moral purity of sacrifices', 10000.00, 'Standard'])
    products.append(['LB', 'Currency test unit', 'Count currency and check for conterfeits and tracking', 7500.00, 'Standard'])
    products.append(['CT', 'Trap door (volcano pack)', 'Trapdoor mechanism (volcano pack)', 952495.00, 'Standard'])
    products.append(['FN', 'Conference table', 'Conference table, seats 20, with holographic display', 12500.00, 'Standard'])
    products.append(['FN', 'Overlord desk', 'Desk with built-in control panels', 8000.00, 'Standard'])
    products.append(['FN', 'Wall control panel', 'Control panel mounted against a wall', 15000.00, 'Standard'])
    products.append(['PK', 'Control room package', 'Package: Basic volcano-themed control room, including conference table trapdoor integration', 1150000.00, 'Standard'])

    return products



def populate_addresses():
    if Address.objects.all().count() > 0:
        return

    companies_info = [
        [False, 'GBP', 'Aardvark', 'Aardvark Tunneling Company Limited'],
        [True, 'GBP', 'Baracudax', 'Baracudax Limited'],
        [True, 'GBP', 'Corvex', 'Corvex Incorporated'],
        [False, 'USD', 'DBF', 'Danabra-Blumsfeld-Faroni Limited']
    ]    
    companies = []

    for co in companies_info:
        c = Company(
                created_by = ADMIN,
                full_name = co[3],
                name = co[2],
                currency = co[1],
                is_agent = co[0]        
        )
        c.save()
        companies.append(c)

    site_and_address = [
        [companies[0], 'Accounts Office', True, False,
            ['GB', 'West Midlands', 'B1 1BB', 'Aardvark Tunneling Company Limited,\nFloor 3, 11 Swanky Street,\nBirmingham', '']
        ],
        [companies[0], 'Warehouse (In)', False, True,
            ['GB', 'West Midlands', 'B11 1AA', 'Aardvark Tunneling Co. Ltd,\nUnit 1, Some Industrial Estate,\n Forest Road, Bingleton', '']
        ],
        [companies[0], 'Warehouse (Out)', False, False,
            ['GB', 'West Midlands', 'B11 1AA', 'Aardvark Tunneling Co. Ltd.,\nUnit 2, Some Industrial Estate,\n Forest Road, Bingleton', '']
        ],
        [companies[1], 'Accounts', True, False,
            ['GB', 'East Sussex', 'BN12 7XF', 'Baracudax Ltd.,\n7 Fortesque Road,\nLittle Blithering, New Fangleton', '']
        ],
        [companies[1], 'Goods In', False, True,
            ['GB', 'East Sussex', 'BN14 4DD', 'Baracudax Ltd.,\nUnit 9, Fancy Industrial Estate,\n New Road, Old Fangleton', '']
        ],
        [companies[2], 'Main', True, True,
            ['GB', 'Oxford', 'OX32 9JS', 'Corvex Inc. (UK), Unit 43, Grotty Industrial Estate,\n Swan Pond Road, Tadfield', '']
         ],
        [companies[3], 'Main', True, True,
            ['US', 'California', '90210', 'DBF, 345 Acadia Place,\nMartin Luther King Bld.,\nMHZ, AFK, WTF', '']
        ]
    ]

    for sa in site_and_address:
        s = Site(
            created_by = ADMIN,
            company = sa[0],
            name = sa[1],
            default_invoice = sa[2],
            default_delivery = sa[3]
        )
        s.save()

        addr = sa[4]
        a = Address(
            created_by = ADMIN,
            site = s,
            country = addr[0],
            region = addr[1],
            postcode = addr[2],
            address = addr[3],
            contact = addr[4]
        )
        a.save()

    return

main()