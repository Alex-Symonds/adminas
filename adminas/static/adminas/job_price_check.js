// Job page, "selling price is {NOT }CONFIRMED" indicator-button thing
// (which toggles the price confirmation status on the server, then updates the page)
// and the "tap a part number to see the description" thing.

document.addEventListener('DOMContentLoaded', () => {

    let price_confirmation_btn = document.getElementById('price_confirmation_button');
    if(price_confirmation_btn != null){
        price_confirmation_btn.addEventListener('click', (e) => {
            toggle_price_check(e);
        });
    }

    let price_check_table_ele = document.getElementById('price_check_table');
    price_check_table_ele.querySelectorAll('.details-toggle').forEach(span => {
        span.addEventListener('click', (e) => {
            toggle_part_desc(e);
        });
    });
    price_check_table_ele.querySelectorAll('.details').forEach(span => {
        span.addEventListener('click', (e) => {
            toggle_part_desc(e);
        });
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


function toggle_part_desc(e){
    const HIDE_CLASS = 'hide';
    let clicked_ele = e.target;

    let parent_ele = clicked_ele.parentElement;
    if (parent_ele == null){
        return
    }

    let part_desc_ele = parent_ele.querySelector('.details');
    if (part_desc_ele == null){
        return
    }

    if (part_desc_ele.classList.contains(HIDE_CLASS)){
        part_desc_ele.classList.remove(HIDE_CLASS);
    } else {
        part_desc_ele.classList.add(HIDE_CLASS);
    }
}