# PDF document variables to adjust the CSS and the "company" header and footer.
CSS_FORMATTING_FILENAME = 'document_user'
HTML_HEADER_FILENAME = 'pdf_doc_2_user_h'
HTML_FOOTER_FILENAME = 'pdf_doc_2_user_f'


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

# Note: these depend on the heights of the user's document header and footer
MAX_ROWS_WO = 32
MAX_ROWS_OC = 35
