const ID_BEGIN_FILTER_BUTTON = 'id_filter_records';
const ID_FILTER_OPTIONS_ELE = 'id_filter_options';
const CLASS_FILTER_OPTIONS_BODY = 'filter-options-body';

const FALLBACK_STR = '-';

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById(ID_BEGIN_FILTER_BUTTON).addEventListener('click', (e) => {
        open_filter_options_ele(e);
    });

});


async function open_filter_options_ele(e){
    let filter_button = e.target;

    let filter_options_ele = await create_ele_filter_options();

    filter_button.after(filter_options_ele);
}

async function create_ele_filter_options(){
    let filter_options_ele = create_generic_ele_formy_panel();
    filter_options_ele.id = ID_FILTER_OPTIONS_ELE;

    filter_options_ele.append(create_ele_filter_options_close_btn());
    filter_options_ele.append(create_ele_filter_options_heading());
    filter_options_ele.append(await create_ele_filter_options_body());
    filter_options_ele.append(create_ele_filter_options_submit());

    return filter_options_ele;
}

function create_ele_filter_options_heading(){
    let ele = document.createElement('h4');
    ele.classList.add(CSS_GENERIC_PANEL_HEADING);
    ele.innerHTML = 'Filter Options';
    return ele;
}

function create_ele_filter_options_close_btn(){
    let btn = create_generic_ele_cancel_button();
    btn.addEventListener('click', () => {
        let ele = document.getElementById(ID_FILTER_OPTIONS_ELE);
        if(ele !== null){
            ele.remove();
        }
    });
    return btn;
}

async function create_ele_filter_options_body(){
    let ele = document.createElement('div');
    ele.classList.add(CLASS_FILTER_OPTIONS_BODY);

    ele.append(create_filter_option_text_input('Reference', 'job, quote or purchase order'));
    ele.append(await create_filter_option_select('Customer'));
    ele.append(await create_filter_option_select('Agent'));
    ele.append(create_filter_option_date_range('Date of Entry'));

    return ele;
}

function create_filter_option_base(label_str, explanation = FALLBACK_STR){
    // Use this for the stuff that'll be identical for each option, regardless of type
    let ele = document.createElement('div');
    
    let label = document.createElement('label');
    label.innerHTML = label_str;
    label.for = 'id_filter_' + label_str.replaceAll(' ', '_');
    ele.append(label);

    if(explanation !== FALLBACK_STR){
        let explanation_ele = document.createElement('span');
        explanation_ele.innerHTML = explanation;
        ele.append(explanation_ele);
    }

    return ele;
}

function create_filter_option_text_input(label_str, explanation = FALLBACK_STR){
    let ele = create_filter_option_base(label_str, explanation);

    let input_ele = document.createElement('input');
    input_ele.type = 'text';
    input_ele.id = 'id_filter_' + label_str.replaceAll(' ', '_');

    ele.append(input_ele);
    return ele;
}

function create_filter_option_date_range(label_str){
    let ele = document.createElement('fieldset');

    let heading = document.createElement('legend');
    heading.innerHTML = label_str;
    ele.append(heading);

    let start_label = document.createElement('label');
    start_label.innerHTML = 'From';
    start_label.for = 'id_filter_range_start';
    ele.append(start_label);

    let date_start = create_ele_dateinput('range_start');
    ele.append(date_start);


    let end_label = document.createElement('label');
    end_label.innerHTML = 'To';
    end_label.for = 'id_filter_range_end';
    ele.append(end_label);

    let date_end = create_ele_dateinput('range_end');
    ele.append(date_end);

    return ele;
}

function create_ele_dateinput(name){
    let input_ele = document.createElement('input');
    input_ele.type = 'date';
    input_ele.id = 'id_filter_' + name.replaceAll(' ', '_');
    return input_ele;
}


function create_ele_filter_options_submit(){
    let ele = create_generic_ele_submit_button();
    ele.classList.add('full-width-button');
    ele.innerHTML = 'apply filter';

    ele.addEventListener('click', () => {
        reload_page_with_filters();
    });
    return ele;
}

async function create_filter_option_select(label_str){
    let list_of_options = await get_options_from_server(label_str);

    let ele = create_filter_option_base(label_str);

    let select_ele = document.createElement('select');

    let default_option = document.createElement('option');
    default_option.selected = true;
    default_option.value = '0';
    default_option.innerHTML = '---------';
    select_ele.append(default_option);

    for(let i = 0; i < list_of_options.length; i++){
        var new_option = document.createElement('option');
        new_option.value = list_of_options[i].id;
        new_option.innerHTML = list_of_options[i].display_str;
        select_ele.append(new_option);
    }

    ele.append(select_ele);
    return ele;
}

async function get_options_from_server(label_str){
    let response = await fetch(`${URL_SELECT_OPTIONS}?info=${label_str.toLowerCase()}_list`)
                    .catch(error => {
                        console.log('Error: ', error)
                    });

    let response_json = await response.json();
    return response_json['data'];
}




function reload_page_with_filters(){
    console.log('TODO: reload the Records page with some exciting filters applied');
}