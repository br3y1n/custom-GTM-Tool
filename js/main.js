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

$('#xlsxFile').on('change', event => {

    const
        allowedType = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", //.xlsx
            "application/vnd.ms-excel" //.xls
        ],
        file = event.target.files[0],
        IS_ALLOWED = allowedType.includes(file.type)

    if (IS_ALLOWED) {
        const
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
        }
    }

    else {
        $(this).val(null)
        alert('Formato no permitido')
    }
})
