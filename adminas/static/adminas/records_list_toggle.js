const CLASS_BTN_SHOW_PRODUCT_LIST = 'list-show-btn';
const CLASS_BTN_HIDE_PRODUCT_LIST = 'list-hide-btn';
const CLASS_PRODUCT_LIST = 'records-list';

document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll(`.${CLASS_BTN_SHOW_PRODUCT_LIST}`).forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggle_hide_product_list_panel(e.target, false);
        });
    });

    document.querySelectorAll(`.${CLASS_BTN_HIDE_PRODUCT_LIST}`).forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggle_hide_product_list_panel(e.target, true);
        });
    });

});

function toggle_hide_product_list_panel(btn, want_hide){
    let parent_ele = btn.closest('td');
    let panel_ele = parent_ele.querySelector(`.${CLASS_PRODUCT_LIST}`);

    let has_hide = panel_ele.classList.contains('hide');

    if(has_hide && !want_hide){
        panel_ele.classList.remove('hide');
    }
    else if(!has_hide && want_hide){
        panel_ele.classList.add('hide');
    }
    return;
}