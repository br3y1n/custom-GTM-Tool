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
                tags: {}
            },
            nomalizeSpaces = text => text.trim().replace(/\s{2,}/g, ' ')

        let
            tagNumber = 1

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

                        customGTM.tags[`tag_${tagNumber}`] = normalizeTagValues
                        tagNumber++
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