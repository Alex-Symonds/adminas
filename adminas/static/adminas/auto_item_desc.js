/*
    Automatic JobItem product descriptions.
        > Add event listener to any/all product dropdowns
        > Add an element underneath each for displaying the result
*/

const AUTO_DESC_CLASS = 'desc';
const AUTO_PRICE_CLASS = 'item-price-results';

document.addEventListener('DOMContentLoaded', (e) => {
    document.querySelectorAll('[id^="id_form-"][id$="-product"]').forEach(dd => {
        auto_item_desc_listener(dd);
        dd.after(get_auto_desc_element());
    })
})


function get_auto_desc_element(){
    span = document.createElement('span');
    span.classList.add(AUTO_DESC_CLASS);
    return span;
}

function auto_item_desc_listener(dropdown){
    dropdown.addEventListener('change', (e) => {
        update_auto_description(e);
    });
}

function update_auto_description(e){
    e.preventDefault();
    product_id = e.target.value;
    job_id = JOB_ID;
    fetch(`${URL_ITEMS}?product_id=${product_id}&job_id=${job_id}`)
    .then(response => response.json())
    .then(item_info => {
        display_auto_description(e, item_info);
    })
    .catch(error =>{
        console.log('Error: ', error);
    });
}

function display_auto_description(e, data){
    desc_span = e.target.nextElementSibling;
    desc_span.innerHTML = data['desc'];
}


