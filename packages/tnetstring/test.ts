import * as tns from './tnetstring'

test('dump a pushpin message', () => {
  const message = tns.dump({
    formats: {
      'http-stream': {
        content: 'a chunk of data\n',
      },
    },
    channel: 'mychannel',
    id: 'an-item-id',
  })

  expect(message).toMatchInlineSnapshot(`
    "104:7:formats,49:11:http-stream,30:7:content,16:a chunk of data
    ,}}7:channel,9:mychannel,2:id,10:an-item-id,}"
  `)
})

test('dump a byte array', () => {
  const buffer = Buffer.from([1, 2, 3])
  const dumpedBuffer = tns.dump(buffer)
  expect(dumpedBuffer).toMatchInlineSnapshot(`"3:,"`)
  const parsedBuffer = Buffer.from(dumpedBuffer.slice(2, -1))
  expect(buffer.equals(parsedBuffer)).toBeTruthy()
})

test('dump the rainbow', () => {
  // null
  expect(tns.dump(null)).toMatchInlineSnapshot(`"0:~"`)
  // integer
  expect(tns.dump(0)).toMatchInlineSnapshot(`"1:0#"`)
  // float
  expect(tns.dump(0.5)).toMatchInlineSnapshot(`"3:0.5^"`)
  // empty array
  expect(tns.dump([])).toMatchInlineSnapshot(`"0:]"`)
  // empty object
  expect(tns.dump({})).toMatchInlineSnapshot(`"0:}"`)
  // utf-8 string
  expect(tns.dump('გთხოვთ')).toMatchInlineSnapshot(`"18:გთხოვთ,"`)
})
