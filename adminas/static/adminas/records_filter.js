/*
    Enable simple filtering of the Records page.
*/


const ID_BEGIN_FILTER_BUTTON = 'id_filter_records';
const ID_FILTER_OPTIONS_ELE = 'id_filter_options';
const CLASS_FILTER_OPTIONS_BODY = 'filter-options-body';
const ID_FILTER_CONTROLS_CONTAINER = 'filter_controls';
const ID_PREFIX_FILTER_FIELDS = 'id_filter_';

const FALLBACK_STR = '-';
const RANGE_START = 's';
const RANGE_END = 'e';

const RECORDS_FILTER_SETTINGS = [
    {
        'title': 'Job Reference',
        'input_type': 'single-text',
        'id': 'ref_job'
    },
    {
        'title': 'PO Reference',
        'input_type': 'single-text',
        'id': 'ref_po'
    },
    {
        'title': 'Quote Reference',
        'input_type': 'single-text',
        'id': 'ref_quote'
    },
    {
        'title': 'Customer',
        'input_type': 'select',
        'id': 'customer'
    },
    {
        'title': 'Agent',
        'input_type': 'select',
        'id': 'agent'
    },
    {
        'title': 'Date of Entry',
        'input_type': 'range-date',
        'id': 'date'
    }
]



// Evenet listeners for existing buttons
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById(ID_BEGIN_FILTER_BUTTON).addEventListener('click', () => {
        open_filter_options_ele();
    });

});









/* ----------------------------------------------------------------------------------------------------
Open Filter Options
---------------------------------------------------------------------------------------------------- */
async function open_filter_options_ele(){
    let filter_container = document.getElementById(ID_FILTER_CONTROLS_CONTAINER);
    let filter_options_ele = await create_ele_filter_options();
    filter_container.append(filter_options_ele);
}

// Open Filter Options: Main function to create the "window"
async function create_ele_filter_options(){
    let filter_options_ele = create_generic_ele_formy_panel();
    filter_options_ele.id = ID_FILTER_OPTIONS_ELE;

    filter_options_ele.append(create_ele_filter_options_close_btn());
    filter_options_ele.append(create_ele_filter_options_heading());
    filter_options_ele.append(await create_ele_filter_options_body());
    filter_options_ele.append(create_ele_filter_options_submit());

    return filter_options_ele;
}

// Open Filter Options: Component
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

// Open Filter Options: Component
function create_ele_filter_options_heading(){
    let ele = document.createElement('h4');
    ele.classList.add(CSS_GENERIC_PANEL_HEADING);
    ele.innerHTML = 'Filter Options';
    return ele;
}



// Open Filter Options: Component with selects populated with server data
async function create_ele_filter_options_body(){
    let ele = document.createElement('div');
    ele.classList.add(CLASS_FILTER_OPTIONS_BODY);

    for(let i = 0; i < RECORDS_FILTER_SETTINGS.length; i++){
        if(RECORDS_FILTER_SETTINGS[i].input_type === 'single-text'){
            ele.append(create_filter_option_text_input(RECORDS_FILTER_SETTINGS[i]));
        }
        else if(RECORDS_FILTER_SETTINGS[i].input_type === 'select'){
            ele.append(await create_filter_option_select(RECORDS_FILTER_SETTINGS[i]));
        }
        else if(RECORDS_FILTER_SETTINGS[i].input_type === 'range-date'){
            ele.append(create_filter_option_date_range(RECORDS_FILTER_SETTINGS[i]));
        }
    }

    return ele;
}

// Open Filter Options: Component
function create_ele_filter_options_submit(){
    let ele = create_generic_ele_submit_button();
    ele.classList.add('full-width-button');
    ele.innerHTML = 'apply filter';

    ele.addEventListener('click', () => {
        reload_page_with_filters();
    });
    return ele;
}


// Open Filter Options: Body component
function create_filter_option_base(FILTER_SETTINGS){
    // Use this for the stuff that'll be reused for each option, regardless of type
    let ele = document.createElement('div');
    
    let label = document.createElement('label');
    label.innerHTML = FILTER_SETTINGS.title;
    label.for = ID_PREFIX_FILTER_FIELDS + FILTER_SETTINGS.id;
    ele.append(label);

    return ele;
}

// Open Filter Options: Body component
function create_filter_option_text_input(FILTER_SETTINGS){
    let ele = create_filter_option_base(FILTER_SETTINGS);

    let input_ele = document.createElement('input');
    input_ele.type = 'text';
    input_ele.id = ID_PREFIX_FILTER_FIELDS + FILTER_SETTINGS.id;

    ele.append(input_ele);
    return ele;
}

// Open Filter Options: Body component
function create_filter_option_date_range(FILTER_SETTINGS){
    let ele = document.createElement('fieldset');

    let heading = document.createElement('legend');
    heading.innerHTML = FILTER_SETTINGS.title;
    ele.append(heading);

    let start_label = document.createElement('label');
    start_label.innerHTML = 'From';
    start_label.for = ID_PREFIX_FILTER_FIELDS + RANGE_START + FILTER_SETTINGS.id;
    ele.append(start_label);

    let date_start = create_ele_dateinput(RANGE_START + FILTER_SETTINGS.id);
    ele.append(date_start);


    let end_label = document.createElement('label');
    end_label.innerHTML = 'To';
    end_label.for = ID_PREFIX_FILTER_FIELDS + RANGE_END + FILTER_SETTINGS.id;
    ele.append(end_label);

    let date_end = create_ele_dateinput(RANGE_END + FILTER_SETTINGS.id);
    ele.append(date_end);

    return ele;
}

// Open Filter Options: Body component
function create_ele_dateinput(id_suffix){
    let input_ele = document.createElement('input');
    input_ele.type = 'date';
    input_ele.id = ID_PREFIX_FILTER_FIELDS + id_suffix;
    return input_ele;
}


// Open Filter Options: Body component
async function create_filter_option_select(FILTER_SETTINGS){
    let ele = create_filter_option_base(FILTER_SETTINGS);

    let select_ele = document.createElement('select');
    select_ele.id = ID_PREFIX_FILTER_FIELDS + FILTER_SETTINGS.id;

    let default_option = document.createElement('option');
    default_option.selected = true;
    default_option.value = '0';
    default_option.innerHTML = '---------';
    select_ele.append(default_option);

    let list_of_options = await get_options_from_server(FILTER_SETTINGS.id);
    for(let i = 0; i < list_of_options.length; i++){
        var new_option = document.createElement('option');
        new_option.value = list_of_options[i].id;
        new_option.innerHTML = list_of_options[i].display_str;
        select_ele.append(new_option);
    }

    ele.append(select_ele);
    return ele;
}

// Open Filter Options: Query server for the list of valid options for each select
async function get_options_from_server(field_id){
    let response = await fetch(`${URL_SELECT_OPTIONS}?info=${field_id}_list`)
                    .catch(error => {
                        console.log('Error: ', error)
                    });

    let response_json = await response.json();
    return response_json['data'];
}


















/* ----------------------------------------------------------------------------------------------------
Submit Filter Options
---------------------------------------------------------------------------------------------------- */
// Apply Filter: main function, called by the "apply filter" button
function reload_page_with_filters(){
    let get_params = create_get_parameters_for_records_filter();
    window.location.href = `${URL_RECORDS}${get_params}`;
    return;
}

// Apply Filter: GET parameters obtained and formatted for use in the URL
function create_get_parameters_for_records_filter(){
    let get_param_list = create_list_get_parameters_for_records_filter();

    if(get_param_list.length > 0){
        let get_param_str = `?${get_param_list[0]}`;
        for(let g = 1; g < get_param_list.length; g++){
            get_param_str += `&${get_param_list[g]}`;
        }
        return get_param_str;
    }

    return '';
}

// Apply Filter: GET parameters in a list. Contents derived from the user's inputs
function create_list_get_parameters_for_records_filter(){
    let get_param_list = [];

    for(let i = 0; i < RECORDS_FILTER_SETTINGS.length; i++){
        var get_param = '';
        var field_ele = document.getElementById(ID_PREFIX_FILTER_FIELDS + RECORDS_FILTER_SETTINGS[i].id);

        if(field_ele !== null){
            if(RECORDS_FILTER_SETTINGS[i].input_type === 'single-text'){
                get_param = get_param_from_input(RECORDS_FILTER_SETTINGS[i].id, field_ele.value);
            }
            else if(RECORDS_FILTER_SETTINGS[i].input_type === 'select'){
                get_param = get_param_from_select(RECORDS_FILTER_SETTINGS[i].id, field_ele.value);
            }
        }
        else if(RECORDS_FILTER_SETTINGS[i].input_type === 'range-date'){
            get_param = get_param_from_range(ID_PREFIX_FILTER_FIELDS, RECORDS_FILTER_SETTINGS[i].id);
        }
        else {
            console.log('Error: ', 'Filter option DOM element is missing.');
            return;
        }

        if(get_param !== ''){
            get_param_list.push(get_param);
        }
    }

    return get_param_list;
}

// Apply Filter: Check the input is not blank, then format it for the GET list
function get_param_from_input(field_name, input_value){
    if(input_value !== ''){
        return create_str_get_param(field_name, input_value);
    } 
    return ''; 
}

// Apply Filter: Check the select is not on the default option, then format it for the GET list
function get_param_from_select(field_name, input_value){
    if(input_value !== '0'){
        return create_str_get_param(field_name, input_value);
    } 
    return '';
}

// Apply Filter: Check for inputs in the start and end dates.
// Note: In the event of a start and end date, this returns two parameters "stuck together".
function get_param_from_range(id_prefix, field_name){
    let get_param = '';

    let input_ele = document.getElementById(id_prefix + RANGE_START + field_name);
    if(input_ele !== null){
        get_param += get_param_from_input(RANGE_START + field_name, input_ele.value);
    }

    input_ele = document.getElementById(id_prefix + RANGE_END + field_name);
    if(input_ele !== null){
        if(get_param !== ''){
            get_param += '&';
        }
        get_param += get_param_from_input(RANGE_END + field_name, input_ele.value);
    }

    return get_param;
}

// Apply Filter: given a field name and an input value, format it GET-parameter-style with an "=" in between.
function create_str_get_param(field_name, input_value){
    let input_for_url = input_value;
    return `${field_name}=${input_for_url}`;
}

