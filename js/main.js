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
            tagObjects = {}

        let
            tagNumber = 1

        Object.values(workbook.Sheets).forEach(sheet => {
            Object.values(sheet).forEach(cell => {
                if (cell.w && cell.w.includes('dataLayer.push')) {
                    const
                        TAG_VALUE_STRING = cell.w.substring(15, cell.w.length - 2).replace(/\'/g, '\"'),
                        tagValueObject = JSON.parse(TAG_VALUE_STRING)

                    tagObjects[`tag_${tagNumber}`] = tagValueObject
                    tagNumber++
                }
            })
        })

        processData(tagObjects)
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

function processData(tagObjects) {

    const
        HAS_DATA = JSON.stringify(tagObjects) != '{}'

    if (HAS_DATA) {

        const
            createTextLineJS = tags => {
                const
                    tagEntries = Object.entries(tags),
                    LAST_TAG = tagEntries.length - 1

                let
                    tagLines = ''

                tagEntries.forEach((tag, idx) => {
                    const
                        TAG_KEY = tag[0],
                        TAG_VALUE = JSON.stringify(tag[1]),
                        TAG_LINE = `\t\t${TAG_KEY}: ${TAG_VALUE}${LAST_TAG != idx ? ',\n' : ''}`

                    tagLines += TAG_LINE
                })

                return tagLines
            },
            stringToCopy = `const \n\tcustomGTM = new CustomGTM({\n${createTextLineJS(tagObjects)} \n\t})\n`

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
