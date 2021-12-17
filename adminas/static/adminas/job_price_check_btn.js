// Job page, "selling price is {NOT }CONFIRMED" indicator-button thing.
// Toggles the price confirmation status on the server, then updates the page.

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('price_confirmation_button').addEventListener('click', (e) => {
        toggle_price_check(e);
    });

});


// Backend
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
        if('message' in data){
            console.log('message');
        }
        else {
            // Reload the page
            location.reload();
        }
    })
}
