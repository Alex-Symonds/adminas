# Address dropdown
ADDRESS_DROPDOWN = [
    'Agent',
    'Customer',
    'Other'
]


# Supported currencies
GBP = 'GBP'
EUR = 'EUR'
USD = 'USD'
SUPPORTED_CURRENCIES = [
    (GBP, 'GBP'),
    (EUR, 'EUR'),
    (USD, 'USD')
]

# Supported languages
EN = 'EN'
DE = 'DE'
DEFAULT_LANG = EN
SUPPORTED_LANGUAGES = [
    (EN, 'English'),
    (DE, 'Deutsch')
] 

# Serial/Batch numbers
UID_CODE_LENGTH = 4
ANON_CODE = 'NONE'
SERIAL_CODE = 'ONE'
BATCH_CODE = 'MANY'
UID_OPTIONS = [
    (ANON_CODE, 'None'),
    (SERIAL_CODE, 'Per item'),
    (BATCH_CODE, 'Per batch')
]

# Shipping
INCOTERMS = [
    ('EXW', 'EXW'),
    ('FCA', 'FCA'),
    ('FOB', 'FOB'),
    ('CPT', 'CPT'),
    ('CIP', 'CIP'),
    ('DAP', 'DAP'),
    ('DDP', 'DDP')
]


# Documents
DOC_CODE_MAX_LENGTH = 2
WO_CARD_CODE = 'WO'
OC_CODE = 'OC'
DOCUMENT_TYPES = [
    (WO_CARD_CODE, 'Works Order Card'),
    (OC_CODE, 'Order Confirmation')
]

