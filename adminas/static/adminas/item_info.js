const AUTO_DESC_CLASS = 'item-full-desc';
const AUTO_PRICE_CLASS = 'item-price-results';

document.addEventListener('DOMContentLoaded', (e) => {
    document.querySelectorAll('[id^="id_form-"][id$="-product"]').forEach(dd => {
        auto_item_desc_listener(dd);
        dd.after(get_auto_desc_element());
    })
    /*
    document.querySelectorAll('[id^="id_form-"][id$="-price_list"]').forEach(dd => {
       auto_item_price_listener(dd);
       dd.after(get_auto_prices_element());
    })*/
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

function get_auto_prices_element(){
    
}

function auto_item_price_listener(dropdown){
    dropdown.addEventListener('change', (e) => {
        update_auto_item_prices(e);
    });
}

function update_auto_item_prices(e){
    alert('HAI!');
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


