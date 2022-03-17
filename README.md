# Harvard's CS50w: Capstone Project, Adminas, by Alex Symonds

## Introduction
Adminas is an internal tool for office employees to enter purchase orders; check the order against prices and product specifications; then produce one or more order confirmation PDFs (for the customer) and one or more work order PDFs (for whoever prepares the orders).

The program assumes that:
- A system admin will modify some HTML/CSS files to create a company header/footer for document PDFs
- A system admin will make use of Django's admin pages to enter and maintain some supporting "system data" (i.e. an address book; prices, including special resale deals; products, including details about modular products and standard accessories)
- All users are employees of the same company and have access to all the data
- All users are trusted to enter any price for any item[^1]
- When completing modular items[^2], users are trusted to exceed the allowed quantity of selections, but are restricted to adding only "valid" items[^3]

Expected workflow is: New > Add Items => Complete Modular Items => Add PO > Check and confirm prices > Create and Issue documents. However, other than requiring some details to be entered when creating the job, Adminas doesn't mind if users wish to do things in a different order. It's up to the user to use the warnings/information Adminas gives them to judge what actions are appropriate.

[^1]: Adminas does not police pricing because high, low, zero or negative prices can be correct under certain circumstances, e.g. customer is paying extra for a special modification; salesperson offered a special discount to win an order; warranty replacement; a line item intended to remove something.

[^2]: For the purposes of Adminas, a "modular item" is a method of handling products with multiple variations. For example, suppose a company is selling a testing instrument which requires at least one magnification lens to function and has space for two more, with seven different lenses to choose between. The company could choose to handle this situation by making the testing instrument a "modular item": have one product for a lense-less testing instrument, seven products for the lenses, then require all customers who order the instrument to also order 1 - 3 lenses. In comparison to other methods, utilising modular items results in fewer products in the database than making a separate instrument product for each possible combination of 1 - 3 lenses (though Adminas would support this approach as well) and less complexity than having a "default" set of lenses and allowing substitutions (Adminas does not currently support substitutions).

[^3]: Exceeding the quantity is permitted -- with a warning -- because assigning "too many" of a slot filler could be reasonable if the customer also wants some extras "on the side" (e.g. spare parts, or perhaps the product is designed for users to be able to swap out slot fillers themselves) and the user wants to assign on-the-side child items to their parent item for clarity. The warning is there to remind the user to check the customer understands that some of the items will be on the side.

    Entering invalid items is not permitted for two reasons. First, the most common reason for an invalid item is an error on the PO, so it's a defence against users entering nonsense by mistake. Second, if it isn't an error on the PO, the absence of a valid item from the choice list could reflect an oversight in the system data: preventing users from entering the "invalid" item will hopefully encourage them to seek out the system admin and prompt them to consider if an update to the system data is required.


## Distinctiveness and Complexity
### General
Adminas includes the ability to generate a PDF document (via third-party modules) from information entered into the database and it stores the requirements of modular items to enable users to "build" a complete product and/or check the validity of one built by the customer: none of the other projects included anything of that nature.

### Project 0, Search
The Search project only entailed use of HTML and CSS, with the goal being to copy an existing site appearance and borrow its processing. Adminas is not copying the appearance of another website and it involves a fair amount of JavaScript and Python in addition to the HTML/CSS.

### Project 1, Wiki
Beyond the differences in purpose, the Wiki project was concerned with utilising markdown files to generate webpages, CRUD and searching/filtering the articles. While Adminas is also CRUD-heavy and utilises a degree of search and filtering on the Records page, this is not the sole focus of the program.

### Project 2, Commerce
Commerce is the closest of the previous projects to Adminas, but there's still a lot separating the two. Both projects involve items on sale, but with a different focus: Commerce was managing auctions with independent users ading items for sale, while Adminas assumes it's utilised in-house by a company offering a set catalogue of products with set prices and a set discount structure, plus a stable of agents and previous customers. While both projects check a price against something and display the outcome, Adminas performs more comparisons and displays more information.

### Project 3, Mail
Adminas is not a SPA, as Mail was, nor does Adminas allow the transmission of messages between users. That said, Adminas could perhaps benefit from adding elements of Mail if it were to be expanded (e.g. sending users notifications when certain tasks are complete or allowing users to request actions by others).

### Project 4, Network
While Adminas utilises comments and pagination, as did Network, the comments on Jobs are a small feature rather than the primary focus. Adminas is not intended to be a social media site.

### Complexity
As per the project specification: Adminas utilises Django on the backend, using several models; uses Javascript on the frontend; and it's mobile responsive, allowing hypothetical office workers to process orders wherever they may be.


## How to run the application
1. Install modules as per requirements.txt
2. ```python manage.py runserver``` (or the equivalent for your OS)
3. Check if the settings in constants.py are to your liking
4. ```python manage.py makemigrations```
5. ```python manage.py migrate```
6. ```python manage.py createsuperuser``` and go through the normal process (for access to Django admin)
7. (Optional) ```python dummy_data.py``` to populate the database with some addresses, products, prices and one job (all with a "super-villain supplies" theme)
8. Open your preferred web browser and go to http://127.0.0.1:8000/

User Configuration:
* Adjusting the company letterhead (colours/arrangement): ```doc_user.css``` is intended for the user to add their own CSS formatting. It's the only way to apply formatting to the header and footer, but it can also be used to override the CSS settings applied to the "default" documents. The user can choose to rename this file so long as they update ```CSS_FORMATTING_FILENAME``` in ```adminas/constants.py```.
* Adjusting the company letterhead (contents): replacing ```adminas/static/adminas/logo.png``` with a different PNG with the same name will change the logo. The rest of the letterhead contents are in ```adminas/templates/adminas/pdf/``` in two files named "pdf_doc_2_user_*.html" where the * is "h" for the file containing the header and "f" for the one with the footer. The user can choose to rename these files so long as they update ```HTML_HEADER_FILENAME``` and ```HTML_FOOTER_FILENAME``` in ```adminas/constants.py```.
* constants.py also allows the user to adjust which currencies, languages and INCOTERMS are acceptable to them
* "Business data" (i.e. addresses, products, prices: the stuff loaded by dummy_data.py) can be added / amended via Django admin (details as per the section below)


## Additional Information: Data Handled Exclusively via Django Admin (Addresses, Products and Prices)
### Background Info: Address Models
The address book is split across three models, Company, Site and Address.

The Company/Site split is intended to allow one company to have as many different addresses as they need. Many will only need one or perhaps two (one for paperwork, one for deliveries), but for larger companies the sky is the limit: shared accounting offices, shared warehouses, different divisions operating independently under the same banner, etc.

The Site/Address split is intended to support an optional "address history" for keeping a record of physical moves. If Acme's accounting office is moving from one side of town to the other, the system admin can choose whether to overwrite the existing address or add a new address for the same site and leaving the old address alone. Regardless of what they choose, ```Site.current_address()``` will return the correct address.

Address stores only a physical address, an FK to a Site and the date of creation. Site gives context to the Address within the Company: it allows the user to flag whether this address is a "default" address for invoices or deliveries; to add a name/label to it (e.g. accounting office, main warehouse, factory making X). Company stores details about who the company is: whether they're an agent, which currency the operate in, and a shorter version of their name for display purposes.

### Background Info: Product Models
Product information is split across five models: Product, Description, StandardAccessory, SlotChoiceList and Slot.

There should be one Product record for each item that wants its own line on document (that is, items with a selling price and "standard accessories").

Descriptions of Products are stored as separate records, giving users the options of adding multilingual support and keeping a record of old descriptions.

Slot and SlotChoiceList together are used to describe "modular" Products. Suppose the company sells a "joyfully toy-full chocolate egg" which contains 1-4 small toys of the customer's choice: this would be considered a modular product because the egg alone is incomplete, the customer must also order 1-4 toys (for this example, let's say 0 toys is disallowed for business reasons and 5 wouldn't fit). SlotChoiceList is where Adminas stores the list of suitable small toys. It contains a field for a name (this is for the convenience of system admins, it only appears in the Django admin pages) and an MTM table matching the SlotChoiceList to relevant Products (in this example, all toys small enough to fit 4 inside the egg). Slot links the parent Product to the SlotChoiceList and states how many are required and how many are optional. Multiple Slots can be assigned to a single Product in the event of a more complex modular item. A single SlotChoiceList could be used to populate multiple different Slots in multiple different Products (it's up to the system admin to weigh up the pros and cons of "not needing to re-enter the same list more than once" versus "what if we add a new option for ParentA without realising the same list is also used for ParentX, where the new option would be disastrous?").

StandardAccessory is used in cases where one Product is supplied with a selection of other products as standard and the company wishes to mention the additional products on the paperwork. It can be used to add small sundry items to a Product (e.g. a dust cover, a power cable, batteries); to create "package deals" (i.e. create a Product for the package as a whole, then add all the included Products via StandardAccessories); or to create modular items with pre-selected valid options (e.g. there could be an "awfully dinosaur-full chocolate egg" Product where the system admin added four dinosaur toy Products as StandardAccessories).

### Background Info: Price Models
Pricing information is split across four models, Price, PriceList, ResaleCategory and AgentResaleGroup.

PriceList and Price are used to set the "normal" prices. PriceList sets the "valid from" date for a set of prices and assigns a name to the price list (e.g. "2022 Q1") which is intended to be the way the company and their customers/agents refer to the price list. Price stores one item on the price list: it has fields for a currency, a value, and FKs to the Product and the PriceList.

The two "Resale" models are for situations where the company sells directly to customers, but also via resellers/agents. Chances are there'll be some sort of resale discount on offer for the resellers/agents, but not necessarily the same resale discount on all Products and also not necessarily the same resale discount to all agents.

ResaleCategory is used for "default" resale discounts, which are based solely on the Product: it has fields for a category name and the percentage. Adminas assumes that each Product will only have one default resale discount category because if a Product is in two categories where one has 10% resale and one has 20% resale, all agents will insist on applying the 20% category every time and its presence in the 10% category is a pointless source of grumbling and discontent. Since this makes it a OTM relationship, the FK field is inside the Product model as "resale_category".

AgentResaleGroup is used for agent-and-product resale discounts. It has fields for a name, a percentage, and an FK to the agent's Company record. One AgentResaleGroup will probably contain multiple Products and one Product could appear in multiple AgentResaleGroups (maybe the company sells dynamite at 20% standard resale, but Quality Mining Supplies gets 30% for being bulk-buyers, while Acme were only offered 5% because their customers keep misusing the dynamite to target roadrunners, bringing shame and legal challenges to the company), so it's a MTM relationship. For consistency with ResaleCategory this is also inside the Product model, as "special_resale".

### Django Admin: Addresses, Products and Prices
Companys pages include Sites and AgentResaleGroups in tabular format. The inclusion of Sites means system admins can see a list of all Sites for this Company in one place and, importantly, which are flagged as default invoice/delivery addresses, making it easier to manage those flags. AgentResaleGroups provides a convenient list of any/all special deals offered to this agent (when applicable), making it easier to see all special deals currently offered to the agent and adjust the percentages on offer when something new has been negotiated.

In addition to appearing on the Companys pages, Sites and AgentResaleGroups also have "their own" pages in Django admin.

Sites has Addresses included in tabular format. When updating an address, odds are that the system admin will be thinking in terms of "Acme's accounting office has moved" rather than street addresses, so this is intended to make it easier to find the correct address. It also serves to show an address history for each Site, should that be of interest.

AgentResaleGroups has a list of included Products in tabular format. This allows modifications to the list of Products included in each AgentResaleGroup (and the percentages, if the user is so inclined).

Products has Descriptions, StandardAccessories and Slots displayed tabularly: all three of those models can only be accessed via Products in Django admin. Description would've been a field in the Product class/table if it weren't for different languages, so it's an obvious inclusion. StandardAccessories and Slots are describing more complex Products so again, this is the logical location for them.

SlotChoiceLists pages only contain themselves, allowing users to modify the names and which Products are valid options for each choice list. 

PriceList has associated Prices displayed tabularly, allowing users to adjust the name and see the contents in one location. This is the only place where Prices are displayed in Django admin.

ResaleCategorys is where users can see a list of all the standard categories and modify their names and percentages. Each record shows a read-only list of Products assigned to that category. If the user wishes to modify which Products appear in a category, it's necessary to do this via Products.

## Additional Information: Other Data
### Job Models
Job is the main "bucket" for each job. All models relating to a specific Job will have a field with an FK referring back to it.

A PurchaseOrder reflects one purchase order document, as received from a customer. Usually the receipt of a purchase order is what will initiate the creation of a Job, so I considered having an "Order" model instead of a "Job" model and including PO fields in it, but this approach would go horribly wrong under certain rare-but-not-rare-enough circumstances: when a colleague wants something prepared for an exhibition or demonstration, so there's no purchase order but work is required; if the company wants to start work before the PO arrives to meet a tight lead time; if a customer modifies their order via issuing additional POs instead of revising the original one. As such, it's better to have a bucket that represents nothing beyond "one project in Adminas" -- i.e. Job -- and have a separate model for PurchaseOrders.

JobComments enable users to add notes to Jobs. The private/public, pinned and highlighted settings allow users to determine where comments appear and who can see them. Private comments are for reminders and memos that mean something to the author, but wouldn't to anyone else; public is for information about the order which should be shared with anyone working on it. Both "pinned" and "highlighted" comments get a speical panel on the Job page and the JobComments page, based on the assumption that if users have gone to the trouble of emphasising those comments, they should be very emphasised. In addition to this, "pinned" status adds notes to the to-do list page, where they can best help the user distinguish between Jobs or remind them of outstanding tasks. "Highlighted" status adds formatting to make the comment stand out when scrolling through all the comments on the JobComments page.

JobItems are the means by which instances of Products are added to Jobs, with the ability to also state the selling price, the applicable price list, and how many are required. JobItems are used as the basis for document line items and filling modular items.


## Modular JobItems Model
JobModule is used to describe one slot filler on a modular JobItem. Via FK fields it links the parent JobItem, the child JobItem and the Slot being filled, to which it adds a quantity (necessary because JobItem has a quantity field and users won't necessarily want all of them filling the same slot).


### Document Models
There are nine models related to documents: DocumentData, DocumentVersion, DocAssignment, ProductionData, SpecialInstruction, DocumentStaticMainFields, DocumentStaticOptionalFields, DocumentStaticSpecialInstruction, and DocumentStaticLineItem.

DocumentData represents "one document", storing all information about the document which will remain constant across any/all revisions that might be needed. This turns out to be limited to the type of document, the FK to the associated Job, and a reference name.

DocumentVersion represents "one version of one document", it stores information about a document which could change across revisions. The remaining models related to documents have a field for the FK of the associated DocumentVersion (rather than the DocumentData) because they all contain information which could vary across versions.

DocAssignment is a through MTM model, used to link a JobItem to a DocumentVersion, alongside a quantity (necessary because JobItem has a quantity field and users won't necessarily want all of them to appear on the same document).

SpecialInstruction allows users to communicate unusual details with the folks preparing the order (on the works order) and the customer (on the order confirmation). Some orders will have none, while others could have dozens, hence this being a separate model.

Not all documents need production dates, so to avoid lots of "null" in DocumentVersion, it's stored as "ProductionData".

The four ```DocumentStatic*``` models are used to store the content of a document when it's issued, so that Adminas has the information it needs to reconstruct the PDF of the issued document as it was when it was issued, without risk of any subsequent updates being incorrectly retroactively applied.


## Additional Information: Design Decisions
### Address Book Dropdown
Users must select addresses from an address book and are not given the ability to create or update addresses via the New or Job pages. This is because when a user's mind is on the task of processing an order they're probably not giving much consideration to how they can help maintain a pristine address book. Adminas keeps these two tasks completely separate in the hope of avoiding the same Site appearing half a dozen times under slightly different names because users kept forgetting what they'd called it and decided it'd be faster to re-enter the Site than find it.

### Restrictive product descriptions on documents
Adminas doesn't allow users to edit product descriptions (outside of Django admin); it doesn't allow users to group JobItems and display a group name and subtotal on the document; it complains if users fail to include all JobItems on documents. These features are missing because of the two types of documents output by Adminas and how these interact with the most common reasons for wanting to edit a product description.

The most common reasons for wanting to amend a product description are:
1. To match the customer's description or layout
2. The level of detail which is useful to the company would be confusing to third-parties, such as customs or export control
3. The product is being supplied with modifications which affect the description

Work orders (WO) are internal documents, meaning there's no need to consider the needs of customers or third-parties, only those of the user's company. Consistency in wording and display is mostly beneficial to the company, since employees will learn to recognise the standard descriptions at a glance, reducing the risk of miscommunication and increasing efficiency. Its weakness is the risk of employees overlooking information about modifications due to their habit of only glancing at the list of items. This can be mitigated by ensuring modifications are displayed separately and prominently: making a tiny edit in the middle of an otherwise familiar description does not qualify. This is why Adminas prohibits users editing product descriptions on WOs and instead gives them the ability to add "SpecialInstructions" (which appear in a big obvious box at the top).

Order confirmations (OC) are external documents but they're usually just between the company and the customer, third-parties rarely take an interest. Rewording the OC to match the customer's PO would rather defeat one of the primary purposes of the OC -- parroting back a PO does nothing to help confirm the company's understanding of the order matches the customer's -- and customers rarely insist upon it anyway. Editing a product description to reflect modifications makes more sense on an OC (the customer might not even realise their modification is a modification), but modifications probably aren't that common and SpecialInstructions do an ok job of getting the message across on the OC, so it wasn't deemed worth implementing a document-specific product description editor purely for a small subset of OCs.

If Adminas were expanded to output more documents -- particularly ones of interest to third-parties, such as invoices -- then it would require additional functionality when it comes to customising the body content.

### Storage of issued documents
Regarding the use of ```DocumentStatic*``` models to preserve the issued state of a document, I considered two alternatives: storing the actual PDFs in Adminas (so clicking the button a second time shows the previously created PDF instead of making a new one from data); preventing users and super users from updating/deleting anything that's appeared on an issued document.

A large percentage of paper documents stored in filing cabinets are never again seen by human eyes. Assuming the same is true of digital documents, I decided against storing the PDFs: it would use more memory compared to storing just the strings and while it'd greatly reduce the amount of database access (one filename vs. multiple tables and strings), the database access only happens when you issue the document and when you look at it.

I decided against locking records for editing because it'd be annoying to keep having to remake records and set up all the FKs every time a user finds a typo in something that's gone out.


## Additional Information: Ideas for Extension
* Refactor Adminas to work as a website used by multiple different companies, instead of as an in-house tool. Obviously this would require big changes to company-specific settings, data and contents to ensure they're only viewable and editable by the right users.
* Have different types of users with different levels of access (e.g. maybe some employees aren't trusted with entering non-standard prices and are limited to selecting list or calculated resale prices)
* Add Adminas modules for managing addresses, products and prices, so nobody needs to use Django admin
* Order entry data and reports/graphs. Adminas could take information added for PurchaseOrders (on creation, update and deletion), modify this as needed for storing OE figures, then output this as a CSV and/or use it to produce reports and graphs.
* Quotation tool. Salespeople would also benefit from module management to guide them through the options and requirements of modular items. Also, creating a quote would require adding the list of items, entering customer details and setting prices for everything, so in the event of the quote leading to an order, the quote inputs could be used as a basis for generating the Job, saving admin users from pointless duplication of work. It could also allow automatic confirmation of any unusual prices (if they were offered on the quote).
* CMS for salespeople, so they can better manage their quotes.
* Production module. It would be convenient for admin users if Adminas could automatically notify production users of new orders and requested dates, then notify the admin users when production users respond with a scheduled date. Unfortunately it wouldn't be so convenient for production users if they have to keep logging into Adminas solely to see if any new orders have come in, so it'd be better if Adminas also provides them with their own reasons to log in: perhaps a calendar/kanban board so they can block in labour for each order, a stock control system, a production to-do list, etc.
* Expansion to other types of PDFs. Adminas could also handle invoices, packing lists, receipts, shipping documents, case marks, etc. Though in the case of invoices, this would involve a lot more flexibility over the contents and a lot of rules controlling when they can be created, edited and deleted (customers and accountants can get very picky about these details)
* In the event of more documents being involved, it might also be nice to add a visual progress indicator on each Job on the to-do list and Records, so users can see at a glance that this Job needs an invoice and that Job is waiting for shipping arrangements
* Give users a selection of different PDF templates for documents
* Give users a code-less means of adjusting the company-specific HTML/CSS of the PDFs


## What's in each file I created
### Main Folder
#### dummy_data.py
Run from the command line ```python dummy_data.py``` to populate the database with some dummy data (with a "super-villain supplies" theme) for everything which an office worker tasked with entering a purchase order would expect to be "on the system" already. That is:
* Companies, both customers and agents (including addresses, sites, and special resale discount agreements)
* Products (including descriptions, standard accessories and setting up modular items with slots)
* Price lists (including standard resale discounts)

#### populate_pricelist.py
Adding a new empty price list via Django admin is easy enough, but populating it would be a painful process of manually adding a new Price record for each combination of active_product and supported currency. populate_pricelist.py is intended to help with the population step: it creates a set of Price records for every active_product/currency combination and assigns them to the most recent PriceList (assuming it's empty). This means the admin user only needs to create the empty price list, run the script, then enter the new prices. Alternatively, if the new prices are a straightforward "X% increase on whatever it was last time", the user can enter "X" as an optional argument and the program will apply that increase to the previous price for the same product&currency pair, if possible.

### Subfolder adminas/
#### "Standard" Django files
* admin.py has the settings for Django's admin page
* forms.py has the settings for any/all forms
* models.py contains the models, including many methods
* urls.py sets up the URLs and how they correspond to the fucntions in views.py
* views.py contains the logic for handling GET/POST requests
 
#### constants.py 
Contains "business-y" constants: CSS settings for their document stationery, currencies they accept, languages they support, INCOTERMS they allow, etc.

#### util.py
* formatting functions: format_money(), get_plus_prefix(), debug()
* reusable error pages: anonymous_user(), error_page()
* a couple of functions for creating new database objects: add_jobitem() and copy_relations_to_new_document_version()
* get_document_available_items(), which is used by the document_builder page to create a dict of JobItems available for use on a document of a given type


### Subfolder adminas/templatetags/ 
The three files with names beginning with "get" allow Django templates to make use of some class methods which require an object as an argument.

query_transform.py is used by the pagination navigation. The records page uses GET parameters for both pagination and filter settings, so using ```"?page={{ page.next_page_number }}"``` in the pagination navigation (as suggested in the Django docs) would result in it losing all the filter settings, making it impossible to ever see past the first page of filtered records. query_transform.py solves this problem by copying the entire current URL and updating only the GET parameter passed in as an argument.


### Subfolder adminas/templates/adminas/
layout.html is the base for all webpages. Then there's one html file for each page on Adminas.

#### Subfolder components/
* comment_base.html, comment_collapse.html and comment_full.html contain the HTML for a single comment. comment_base.html has the parts common to all comments; comment_collapse.html and comment_full.html extend it in different ways to create the "slimline" version (where you click to expand the section with the buttons) and the full version (where you don't).
* pagination_nav.html is the pagination navigation strip, used on the job_comments and records pages.

#### Subfolder pdf/
Contains the HTML files used for generating PDFs. wkhtmltopdf paginates the main/body HTML file; it also allows users to pass in two other HTML files to serve as a static header and footer across every page of the PDF. For Adminas PDFs, the header and footer will each require two parts: a "company" header/footer (with logos, addresses, contact details etc.) and a "document" header/footer (with any document-specific content that should be repeated on each page, rather than paginated, e.g. reference numbers).

* pdf_doc_0_layout.html contains HTML common to all three of the "final" HTML files used by wkhtmltopdf (that is, the body, the header and the footer).
* pdf_doc_1_*.html extends the layout for each of the three "final" HTML files. It brings together the company and document components (plus anything else needed by all headers, all footers or all bodies).
* pdf_doc_2_user_*.html files contain the company header/footer (aka their letterhead).
* pdf_doc_2_{ doc_type }_*.html files are for the actual document contents ( title, fields, line items, etc.).




### Subfolder adminas/static/adminas/
#### Images
* Everything named "i_*.svg" is an icon.
* logo.png is the company logo used in the PDF company header.

#### CSS
##### styles.css
Used by: all webpages.
"Main" CSS file containing all CSS except for that used on/by the PDFs.

##### doc_preview.css
Used by: PDFs
Formatting to clearly distinguish a "preview" (aka draft) copy of a document from the final, issued version.

##### doc_default_oc.css, doc_default_wo.css
Used by: PDFs.
Formatting for the main contents of each PDF.
Note: wkhtmltopdf doesn't support some CSS features (e.g. flexbox and grid).

##### doc_user.css
Used by: PDFs.
Formatting for user-specific page content, i.e. the company header and footer. In principle, a user could also use this to override the colours on the documents in order to better reflect their corporate branding (though I haven't utilised this in the example).
Note: wkhtmltopdf doesn't support some CSS features (e.g. flexbox and grid).



#### Javascript
##### auto_address.js
Used by: edit.
On changing a dropdown of address names, request the full address from the server and display it on the page.

##### auto_item_desc.js
Used by: job, edit.
On changing a dropdown containing product names, request the product description of the item and display it on the page.

##### document_builder_main.js
Used by: document_builder.
1. Save, issue and delete buttons at the top of the page, plus the "unsaved changes" warning box.
2. Special Instructions: hide/show of the "create new" form, plus "edit mode" and updating the page without a reload afterwards.

##### document_items.js
Used by: document_builder.
Adds functionality to the "split" and "incl/excl" buttons on the item lists.

##### document_main.js
Used by: document_main.
Adds functionality to the two "version" buttons, replace and revert. (Note: "replace" only available on issued documents; revert only available on issued documents with >1 version)

##### items_edit.js
Used by: job.
Enables editing existing JobItems, both via the edit button on the panels for each item or via the pricecheck table.

##### items_new_form.js
Used by: job.
Allows the user to hide/unhide the entire "add new JobItems" form and modify the form to create multiple JobItems in one go.

##### job_comments.js
Used by: job, job_comments, index.
Comment functionality: create, edit, delete and toggling statuses.

##### job_delete.js
Used by: edit.
Enables the "delete" button when editing an existing Job.

##### job_price_check_btn.js
Used by: job.
Functionality for the "selling price is {NOT }CONFIRMED" indicator/button on the Job page. Toggles the price_confirmed status on the server and updates the page.

##### job_toggle.js
Used by: job.
Job page visibility toggles for the "add PO" form and the "add JobItems" form.

##### manage_modules.js
Used by: module_management.
Allows users to edit an existing slot filler; add space for an additional slot filler (via the "+ slot" button); fill an empty slot with an existing JobItem or by creating a new JobItem.

##### po_edit.js
Used by: job.
Job page's PO section. Enables updating and deleting of an existing PO. (Creating a new PO is handled via a form.)

##### records_filter.js
Used by: records.
Enables the filter: opens the "form-like", turns the inputs into appropriate GET parameters, then reloads the page with the parameters.

##### records_list_toggle.js
Used by: records.
Handles the "view" buttons. (If there are multiple POs or items on an order, users can view them in a pop-up by clicking "view").

##### todo_management.js
Used by: job, home, records.
Allows users to adjust which Jobs appear on the to-do list in three ways: add via the "plus" buttons on the Records page; remove via the "minus" circles on the homepage to-do list; toggle via the "indicator" on the Job page.

##### util.js
Used by: any/all pages.
A selection of general-purpose functions available to all pages. Includes: formatting numbers with thousand separator commas; obtaining the date; obtaining a select index based on the display text; finding the last element of a type on the page; a couple of functions from the Django documentation regarding CSRF authentication; functions to hide/show elements based on CSS class; wipe data from a "form row"; several generic DOM elements (message boxes, buttons, panels).
