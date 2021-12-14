/* 
    The Edit Job page has dropdowns showing a display name for each address in the database.
    When the user changes the dropdown, this code looks up the actual address on the server 
    and displays it underneath.
 */

CLASS_ADDRESS_DROPDOWN = 'address-dropdown';

// Add event handlers to all address dropdowns
document.addEventListener('DOMContentLoaded', (e) => {

    document.querySelectorAll('.' + CLASS_ADDRESS_DROPDOWN).forEach(ele => {
        let dd = ele.querySelector('select');
        update_address(dd);
        dd.addEventListener('change', (e) => {
            update_address(e.target);
        });
    });

});

// Address Lookup: main function. Called when the page loads and when the address dropdowns change
async function update_address(ele){
    let display_div = ele.closest('.form-row').querySelector('.display-address');

    if(ele.selectedIndex != 0){
        let json_response = await get_address_from_server(ele.value);
        let display_address = process_address(json_response);
        display_div.innerHTML = display_address;
    } else {
        display_div.innerHTML = '';
    }
}

// Address Lookup: Request the address from the server
async function get_address_from_server(address_id){
    let response = await fetch(`${URL_SITE_ADDRESS}?info=site_address&id=${address_id}`)
    .catch(error => {
        console.log('Error: ', error);
    })
    return await response.json();
}

// Address Lookup: replace commas in the address with new lines; append region, postcode and country
function process_address(data){
    let result = data['address'].replaceAll(',', '<br />');
    result += '<br />';
    result = add_str_and_br_if_not_blank(result, data['region']);
    result = add_str_and_br_if_not_blank(result, data['postcode']);
    result = add_str_and_br_if_not_blank(result, data['country']);

    return result;
}

// Address Lookup: check if a field is blank and, if not, append it and add a newline afterwards
function add_str_and_br_if_not_blank(result, new_str){
    if(new_str != ''){
        return result += new_str + '<br />';
    }
    return result;
}

