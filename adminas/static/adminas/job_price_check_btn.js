document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('price_confirmation_button').addEventListener('click', (e) => {
        toggle_price_check(e);
    });

});




function toggle_price_check(e){
    fetch(`${URL_PRICE_CHECK}`, {
        method: 'POST',
        body: JSON.stringify({
            'new_status': 'false' == e.target.dataset.current_status
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if('current_status' in data){
            update_price_check_on_page(e.target, data['current_status']);
        }
    })
}


function update_price_check_on_page(btn, current_status){
    
    btn.dataset.current_status = current_status;
    if(current_status){
        btn.innerHTML = 'confirmed';
        var wanted_class = 'on';
        var unwanted_class = 'off';
    } else {
        btn.innerHTML = 'UNCONFIRMED';
        var unwanted_class = 'on';
        var wanted_class = 'off';
    }

    let price_check_div = btn.parentElement;
    if(price_check_div.classList.contains(unwanted_class)){
        price_check_div.classList.remove(unwanted_class);
    }

    if(!price_check_div.classList.contains(wanted_class)){
        price_check_div.classList.add(wanted_class);
    }
}