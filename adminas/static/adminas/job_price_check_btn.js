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

    price_check_div = btn.parentElement;
    p = price_check_div.querySelector('p');

    btn.dataset.current_status = current_status;
    if(current_status){
        console.log('Confirmed / wrong');
        p.innerHTML = 'Confirmed';
        btn.innerHTML = 'Wrong Price';
    } else {
        console.log('UNCONFIRMED / confirm');
        p.innerHTML = 'UNCONFIRMED';
        btn.innerHTML = 'Confirm Price';
    }
}