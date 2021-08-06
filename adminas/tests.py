from django.test import TestCase

import datetime
from adminas.models import User, Company, Site, Address, Job

# Create your tests here.
class BackendTestCase(TestCase):
    admin_name = 'admin'
    COMPANIES = ['Agent Co.', 'Customer Bob', 'ThirdParty A Warehouses Ltd.']
    country = 'GB'

    def setUp(self):
        admin = User.objects.create_user(username=self.admin_name, email=f"{self.admin_name}@example.com", password=self.admin_name[0])

    def test_third_party_dropdown_list(self):
        tp_b_name = 'PartyOfThirdiness B'
        tp_c_name = 'Number 3 Third Party C'
        
        admin = User.objects.all()[0]
        agent = self.create_dummy_company_and_addresses(self.COMPANIES[0], admin)
        customer = self.create_dummy_company_and_addresses(self.COMPANIES[1], admin)
        third_party_A = self.create_dummy_company_and_addresses(self.COMPANIES[2], admin)
        third_party_B = self.create_dummy_company_and_addresses(tp_b_name, admin)
        third_party_C = self.create_dummy_company_and_addresses(tp_c_name, admin)

        agent_inv = self.get_invoice_address(agent)
        customer_del = self.get_delivery_address(customer)

        third_pa_inv = self.get_invoice_address(third_party_A)
        third_pa_del = self.get_delivery_address(third_party_A)
        third_pb_inv = self.get_invoice_address(third_party_B)
        third_pc_del = self.get_delivery_address(third_party_C)

        my_job = Job(created_by=admin, name='Delivery to third party A',
                    agent=agent, customer=customer, country=self.country, language='EN', 
                    invoice_to=agent_inv,
                    delivery_to=third_pa_del,
                    currency='GBP', quote_ref='no quote', payment_terms="whenever's good for you :)", incoterm_code='EXW', incoterm_location='United Kingdom')
        my_job.save()

        my_job.pk = None
        my_job.name = 'Invoice to third-party A'
        my_job.invoice_to = third_pa_inv
        my_job.delivery_to = customer_del
        my_job.save()

        my_job.pk = None
        my_job.name = 'Invoice to third-party B'
        my_job.invoice_to = third_pb_inv
        my_job.save()

        my_job.pk = None
        my_job.save()

        my_job.pk = None
        my_job.save()

        my_job.pk = None
        my_job.name = 'Delivery to third-party C'
        my_job.invoice_to = agent_inv
        my_job.delivery_to = third_pc_del
        my_job.save()

        self.assertEqual(Job.objects.all().count(), 6)
        self.assertEqual(agent.third_parties().count(), 3)
        self.assertTrue(third_party_A in agent.third_parties())
        self.assertFalse(agent in customer.third_parties())



    def create_dummy_company_and_addresses(self, name, admin):
        is_agent = False
        if name[0] == 'a' or name[0] == 'A':
            is_agent=True

        c = Company(created_by=admin, full_name=name + ' Ltd. GmbH. Afk.', name=name, is_agent=is_agent, currency='GBP')
        c.save()

        inv_site = Site(created_by=admin, name='Accounting', default_invoice=True, company=c)
        inv_site.save()

        old_addr = Address(created_by=admin, site=inv_site, country=self.country, region='Old invoicey region', postcode='O12 3DD', address='Ye Olde 11 Oldy Road, Old Estate, Oldton', contact='', valid_until=datetime.date(2020, 12, 1))
        old_addr.save()

        now_addr = Address(created_by=admin, site=inv_site, country=self.country, region='New invoicey region', postcode='N33 3WW', address='33 Modern Day Road, Swanky New Estate, Newton', contact='', valid_until=None)
        now_addr.save()

        del_site = Site(created_by=admin, name='Delivery', default_delivery=True, company=c)
        del_site.save()

        del_addr = Address(created_by=admin, site=del_site, country=self.country, region='Delivery region', postcode='D31 1VE', address='22 Warehousey Place, Big Industrial Estate, Storton', contact='', valid_until=None)
        del_addr.save()

        return c     



    def get_invoice_address(self, company_obj):
        return Address.objects.filter(site__company=company_obj).filter(site__default_invoice=True)[0]

    def get_delivery_address(self, company_obj):
        return Address.objects.filter(site__company=company_obj).filter(site__default_delivery=True)[0]

