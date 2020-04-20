$(function () {
    M.AutoInit()
})

$('.nav-tab').click(function () {
    const
        TARGET = $(this).attr('data-target')

    $('.tab-item').not($(TARGET).addClass('active')).removeClass('active')
    $('.nav-tab').not($(`.nav-tab[data-target='${TARGET}']`).not('a.nav-item').addClass('active')).removeClass('active')
    $('.sidenav').sidenav('close')
})

$('.xlsxFile').click(function () {
    const
        allowedType = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", //.xlsx
            "application/vnd.ms-excel" //.xls
        ],
        XLSX_NAME = $(this).data('xlsxname'),
        PROCESS_BUTTON = $(this).data('processbutton'),
        PROCESS_CODE = $(PROCESS_BUTTON).data('processcode'),
        data = {
            allowedType: allowedType,
            processButton: PROCESS_BUTTON,
            xlsxName: XLSX_NAME
        },
        inputFile = document.createElement('input')

    $(XLSX_NAME).val('')
    $(PROCESS_BUTTON).addClass('active').attr('disabled', true).prop('fileData', null)
    $(PROCESS_CODE).removeClass('active')

    inputFile.type = 'file'
    inputFile.accept = allowedType.toString()
    $(inputFile).change(validateType.bind(undefined, data))
    inputFile.click()
})


$('.processXlsx').click(function () {
    const
        file = $(this).prop('fileData'),
        reader = new FileReader(),
        data = {
            thisButton: $(this),
            targetProcess: $(this).data('processcode'),
            xlsxName: $(this).data('xlsxname')
        }

    reader.readAsBinaryString(file)

    reader.onload = function () {

        const
            fileData = reader.result,
            workbook = XLSX.read(fileData, { type: 'binary' }),
            pushData = {
                process: data,
                lastModified: file.lastModified,
                sheets: {}
            },
            nomalizeSpaces = text => text.trim().replace(/\s{2,}/g, ' ')

        Object.entries(workbook.Sheets).forEach(sheet => {
            const
                SHEET_NAME = sheet[0].trim(),
                sheetContent = sheet[1]

            let
                urlSheet = '',
                numberPush = 1

            Object.values(sheetContent).forEach(cell => {

                if (cell.w) {

                    const
                        CELL_TEXT = cell.w.trim(),
                        CELL_TEXT_LC = CELL_TEXT.toLowerCase()

                    if (CELL_TEXT.includes('dataLayer.push')) {
                        const
                            PUSH_VALUE_STRING = CELL_TEXT.substring(15, CELL_TEXT.length - 2).replace(/\'/g, '\"'),
                            pushValueObject = JSON.parse(PUSH_VALUE_STRING),
                            normalizePushValues = {}

                        Object.entries(pushValueObject).forEach(attr => {
                            const
                                KEY = attr[0],
                                VALUE = attr[1]

                            normalizePushValues[KEY] = nomalizeSpaces(VALUE)
                        })

                        numberPush != 1
                            ? pushData.sheets[SHEET_NAME].pushes[`push_${numberPush}`] = normalizePushValues
                            : pushData.sheets[SHEET_NAME] = { pushes: { push_1: normalizePushValues } }

                        numberPush++
                    }

                    if (CELL_TEXT_LC.includes('http://') || CELL_TEXT_LC.includes('https://')) //check again
                        urlSheet = CELL_TEXT_LC

                }
            })

            if (pushData.sheets[SHEET_NAME] && pushData.sheets[SHEET_NAME].pushes)
                pushData.sheets[SHEET_NAME].url = urlSheet
        })

        const
            sheets = Object.entries(pushData.sheets),
            select = sheets.length == 0 ? [] : sheets[0][0],
            SHEET_URL = sheets.length == 0 ? '' : sheets[0][1].url

        sheets.length > 1
            ? runCustomSwal(pushData, generateCustomGTM)
            : generateCustomGTM(pushData, [select], SHEET_URL)

    }

})


function validateType(data, event) {
    const
        file = event.target.files[0],
        IS_ALLOWED = data.allowedType.includes(file.type)

    if (IS_ALLOWED) {
        const
            fileName = file.name

        $(data.xlsxName).val(fileName)
        $(data.processButton).attr('disabled', false).prop('fileData', file)
    }

    else
        swal('Invalid format!', 'The file format isn\'t allowed, it only allows .xlsx or .xls extensions', 'error')
}

function processData(customGTM, data) {

    const
        tagObjects = customGTM.tags,
        assignmentTags = customGTM.assignment,
        HAS_TAGS_DATA = JSON.stringify(tagObjects) != '{}',
        assignmentObject = $(data.targetProcess).find('.assignment')

    if (HAS_TAGS_DATA) {

        const
            createTextLineJS = objects => {
                const
                    objectEntries = Object.entries(objects),
                    LAST_OBJECT = objectEntries.length - 1

                let
                    objectLines = ''

                objectEntries.forEach((object, idx) => {
                    const
                        OBJECT_KEY = object[0],
                        OBJECT_VALUE = JSON.stringify(object[1]),
                        OBJECT_LINE = `\t\t\t${OBJECT_KEY}: ${OBJECT_VALUE}${LAST_OBJECT != idx ? ',\n' : ''}`

                    objectLines += OBJECT_LINE
                })

                return objectLines
            },
            stringToCopy = `const \n\tcustomGTM = new CustomGTM({\n\t\tmetaData: {\n${createTextLineJS(customGTM.metaData)} \n\t\t},\n\t\ttags: {\n${createTextLineJS(tagObjects)} \n\t\t}\n\t})\n`

        createAssignments(assignmentTags, assignmentObject)
        $(data.targetProcess).find('textarea').val(stringToCopy)
        data.thisButton.attr('disabled', true).prop('fileData', null).removeClass('active')
        $(data.targetProcess).addClass('active')
    }

    else {
        $(data.xlsxName).val('')
        data.thisButton.attr('disabled', true).prop('fileData', null)
        swal('Invalid template!', 'This file isn\'t the GTM template', 'error')
    }
}


function createAssignments(assignments, assignmentObject) {
    let
        assignmentList = ''

    Object.entries(assignments).forEach(assignment => {
        const
            TAG_NAME = assignment[0],
            sheetPushes = assignment[1],
            generatePushes = sheets => {
                const
                    sheetsHtml = []

                Object.entries(sheets).forEach(sheet => {
                    const
                        SHEET_NAME = sheet[0],
                        PUSHES = sheet[1].join(' | '),
                        pushSheetHtml = `<b class="sheetName">${SHEET_NAME}(</b> ${PUSHES} <b class="sheetName">)</b>`

                    sheetsHtml.push(pushSheetHtml)
                })

                return sheetsHtml.join(' <b>-</b> ')
            }

        LIST_ELEMENT_STRING = `<li><b>${TAG_NAME} = [</b> ${generatePushes(sheetPushes)} <b>]</b></li>`

        assignmentList += LIST_ELEMENT_STRING
    })

    assignmentObject.html(assignmentList)
}


function runCustomSwal(pushData, callback) {

    const
        swalContent = document.createElement('div'),
        sheetListSelect = [],
        createCheckbox = () => {
            let
                checkboxList = ''

            Object.entries(pushData.sheets).forEach(data => {
                const
                    SHEET = data[0],
                    URL = data[1].url,
                    checkboxElement = ` <li>
                                            <p>
                                                <label>
                                                    <input type="checkbox" class="swalCheckbox" value="${SHEET}">
                                                    <span>Sheet <b>(${SHEET})</b> - url found "<em>${URL}</em>"</span>
                                                </label>
                                            </p>
                                        </li>`

                checkboxList += checkboxElement
            })

            return checkboxList
        },
        createRadiobutton = options => {
            let
                optionList = ''

            options.forEach((option, idx) => {
                radiobuttonElement = ` <li>
                                            <p>
                                                <label>
                                                    <input name="urls" type="radio" value="${option}"${idx == 0 ? ' checked' : ''}>
                                                    <span>${option}</span>
                                                </label>
                                            </p>
                                        </li>`

                optionList += radiobuttonElement
            })

            return optionList
        }

    swalContent.classList.add('swalContent')
    swalContent.innerHTML = `   <p>
                                    The following sheets were found with "pushes", select the sheets that are part of this new customGTM:
                                </p>
                                <ul>
                                    ${createCheckbox()}
                                </ul>`

    swal({
        title: 'Multiple sheets',
        content: swalContent,
        icon: 'info',
        buttons: {
            confirm: {
                text: 'Confirm',
                value: 'confirm'
            },
            cancel: 'cancel'
        }
    }).then(value => {
        if (value == "confirm") {
            const
                checkboxSelect = $('.swalCheckbox:checked'),
                urls = []

            if (checkboxSelect.length > 0) {
                $.each(checkboxSelect, function () {
                    const
                        SHEET_NAME = $(this).val(),
                        SHEET_URL = pushData.sheets[SHEET_NAME].url

                    sheetListSelect.push(SHEET_NAME)
                    if (!urls.includes(SHEET_URL)) urls.push(SHEET_URL)
                })

                if (urls.length > 1) {
                    swalContent.innerHTML = `<p>
                                                The following urls were found, select the url that is part of this new customGTM:
                                            </p>
                                            <ul>
                                                ${createRadiobutton(urls)}
                                            </ul>`

                    return swal({
                        title: 'Multiple urls',
                        content: swalContent,
                        icon: 'info',
                        buttons: {
                            confirm: {
                                text: 'Confirm',
                                value: 'confirm'
                            },
                            cancel: 'cancel'
                        }
                    })
                }

                else
                    callback(pushData, sheetListSelect, urls[0])
            }

            else
                swal({
                    title: 'You did not select an option',
                    text: 'try again',
                    icon: 'error',
                    buttons: {
                        cancel: 'OK'
                    }
                })
        }
    }).then(value => {
        if (value == "confirm") {
            const
                URL_SELECT = $('input[type=radio][name=urls]:checked').val()

            callback(pushData, sheetListSelect, URL_SELECT)
        }
    })
}


function generateCustomGTM(pushData, selects, url) {
    const
        customGTM = {
            metaData: {
                url: url,
                last_modified: pushData.lastModified,
                version: 1
            },
            tags: {},
            assignment: {}
        },
        compareObj = (object1, object2) => {
            const
                objectKeys1 = Object.keys(object1).sort(),
                objectKeys2 = Object.keys(object2).sort()

            if (objectKeys1.length !== objectKeys2.length) return false

            if (objectKeys1.join('') !== objectKeys2.join('')) return false

            for (let idx = 0; idx < objectKeys1.length; idx++) {
                const
                    KEY = objectKeys1[idx]

                if (object1[KEY] !== object2[KEY]) return false
            }

            return true
        },
        checkPushAssignments = (currentTags, newTag) => {

            const
                currentTagEntries = Object.entries(currentTags)

            for (let idx = 0; idx < currentTagEntries.length; idx++) {
                const
                    currentTagEntrie = currentTagEntries[idx],
                    CURRENT_KEY = currentTagEntrie[0],
                    currentTag = currentTagEntrie[1],
                    TAG_EXISTS = compareObj(currentTag, newTag)

                if (TAG_EXISTS) return { assign: true, tag_name: CURRENT_KEY }
            }

            return { assign: false }
        }

    Object.entries(pushData.sheets).forEach(sheet => {
        const
            SHEET_NAME = sheet[0],
            pushes = sheet[1].pushes

        if (selects.includes(SHEET_NAME)) {

            Object.entries(pushes).forEach(push => {
                const
                    PUSH_KEY = push[0],
                    pushValue = push[1]

                const
                    pushAssignments = checkPushAssignments(customGTM.tags, pushValue),
                    NUMBER_TAGS = Object.keys(customGTM.tags).length,
                    TAG_NUMBER = NUMBER_TAGS + 1,
                    TAG_NAME = pushAssignments.assign ? pushAssignments.tag_name : `tag_${TAG_NUMBER}`

                if (!pushAssignments.assign)
                    customGTM.tags[TAG_NAME] = pushValue

                customGTM.assignment[TAG_NAME]
                    ? customGTM.assignment[TAG_NAME][SHEET_NAME]
                        ? customGTM.assignment[TAG_NAME][SHEET_NAME].push(PUSH_KEY)
                        : customGTM.assignment[TAG_NAME][SHEET_NAME] = [PUSH_KEY]
                    : customGTM.assignment[TAG_NAME] = { [SHEET_NAME]: [PUSH_KEY] }
            })
        }
    })

    processData(customGTM, pushData.process)
}