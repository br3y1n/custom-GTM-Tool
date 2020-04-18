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

$('#xlsxFile').click(function () {
    const
        allowedType = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", //.xlsx
            "application/vnd.ms-excel" //.xls
        ],
        inputFile = document.createElement('input')

    inputFile.type = 'file'
    inputFile.accept = allowedType.toString()
    $(inputFile).change(validateType.bind(undefined, allowedType))
    inputFile.click()

    $('#xlsxName').val('')
    $('#processNew').addClass('active')
    $('#code').removeClass('active')
})


$('#processNew').click(function () {
    const
        file = $(this).prop('fileData'),
        reader = new FileReader()

    reader.readAsBinaryString(file)

    reader.onload = function () {

        const
            fileData = reader.result,
            workbook = XLSX.read(fileData, { type: 'binary' }),
            customGTM = {
                metaData: {
                    url: '',
                    last_modified: file.lastModified,
                    version: 1
                },
                tags: {},
                assignment: {}
            },
            nomalizeSpaces = text => text.trim().replace(/\s{2,}/g, ' '),
            compareObj = (object1, object2) => {
                const
                    objectKeys1 = Object.keys(object1).sort(),
                    objectKeys2 = Object.keys(object2).sort()

                if (objectKeys1.length !== objectKeys2.length) {
                    return false
                }

                if (objectKeys1.join('') !== objectKeys2.join('')) {
                    return false
                }

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

                    if (TAG_EXISTS)
                        return {
                            assign: true,
                            tag_name: CURRENT_KEY
                        }

                }

                return {
                    assign: false
                }

            }

        let
            numberPush = 1

        Object.values(workbook.Sheets).forEach(sheet => {
            Object.values(sheet).forEach(cell => {

                if (cell.w) {

                    const
                        CELL_TEXT = cell.w.trim(),
                        CELL_TEXT_LC = CELL_TEXT.toLowerCase()

                    if (CELL_TEXT.includes('dataLayer.push')) {
                        const
                            TAG_VALUE_STRING = CELL_TEXT.substring(15, CELL_TEXT.length - 2).replace(/\'/g, '\"'),
                            tagValueObject = JSON.parse(TAG_VALUE_STRING),
                            normalizeTagValues = {}

                        Object.entries(tagValueObject).forEach(attr => {
                            const
                                KEY = attr[0],
                                VALUE = attr[1]

                            normalizeTagValues[KEY] = nomalizeSpaces(VALUE)
                        })

                        const
                            pushAssignments = checkPushAssignments(customGTM.tags, normalizeTagValues),
                            NUMBER_TAGS = Object.keys(customGTM.tags).length,
                            TAG_NUMBER = NUMBER_TAGS + 1,
                            TAG_NAME = pushAssignments.assign ? pushAssignments.tag_name : `tag_${TAG_NUMBER}`

                        if (!pushAssignments.assign)
                            customGTM.tags[TAG_NAME] = normalizeTagValues

                        customGTM.assignment[TAG_NAME]
                            ? customGTM.assignment[TAG_NAME].push(`push ${numberPush}`)
                            : customGTM.assignment[TAG_NAME] = [`push ${numberPush}`]

                        numberPush++
                    }

                    if (CELL_TEXT_LC.includes('http://') || CELL_TEXT_LC.includes('https://')) {
                        customGTM.metaData.url = CELL_TEXT_LC
                    }
                }
            })
        })

        processData(customGTM)
    }

})


function validateType(allowedType, event) {
    const
        file = event.target.files[0],
        IS_ALLOWED = allowedType.includes(file.type)

    if (IS_ALLOWED) {
        const
            fileName = file.name

        $('#xlsxName').val(fileName)
        $('#processNew').attr('disabled', false).prop('fileData', file)
    }

    else {
        $('#xlsxName').val('')
        $('#processNew').attr('disabled', true).prop('fileData', null)
        swal('Invalid format!', 'The file format isn\'t allowed, it only allows .xlsx or .xls extensions', 'error')
    }

}

function processData(customGTM) {

    const
        tagObjects = customGTM.tags,
        assignmentTags = customGTM.assignment,
        HAS_TAGS_DATA = JSON.stringify(tagObjects) != '{}'

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

        createAssignments(assignmentTags)
        $('#codeToCopy').val(stringToCopy)
        $('#processNew').attr('disabled', true).prop('fileData', null).removeClass('active')
        $('#code').addClass('active')
    }

    else {
        $('#xlsxName').val('')
        $('#processNew').attr('disabled', true).prop('fileData', null)
        $('#code').removeClass('active')
        swal('Invalid template!', 'This file isn\'t the GTM template', 'error')
    }
}


function createAssignments(assignments) {
    let
        assignmentList = ''

    Object.entries(assignments).forEach(assignment => {
        const
            NAME = assignment[0],
            PUSHES = assignment[1].join(' <b>-</b> '),
            LIST_ELEMENT_STRING = `<li><b>${NAME} = [</b> ${PUSHES} <b>]</b></li>`

        assignmentList += LIST_ELEMENT_STRING
    })

    $('.assignment').html(assignmentList)

}