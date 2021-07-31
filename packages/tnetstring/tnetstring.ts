export function dump(data: any): string {
  const serialize = dataTypes[typeof data]
  return serialize ? serialize(data) : ''
}

const dataTypes: { [type: string]: (data: any) => string } = {
  number(data: number) {
    if (!isFinite(data)) {
      throw Error('Infinite numbers not supported')
    }
    const str = data.toString()
    return str.length + ':' + str + (~~data === data ? '#' : '^')
  },
  boolean(data: boolean) {
    const str = data.toString()
    return str.length + ':' + str + '!'
  },
  string(data: string) {
    return strlen(data) + ':' + data + ','
  },
  object(data: Record<string, any> | any[] | Buffer | null) {
    if (data === null) {
      return '0:~'
    }
    if (Buffer.isBuffer(data)) {
      return data.byteLength + ':' + data.toString() + ','
    }

    let type: string
    let entries: string[] = []
    if (Array.isArray(data)) {
      type = ']'
      for (let i = 0; i < data.length; i++) {
        entries.push(this.dump(data[i]))
      }
    } else {
      type = '}'
      for (const key in data)
        if (data.hasOwnProperty(key)) {
          entries.push(dump(key), dump(data[key]))
        }
    }

    const payload = entries.join('')
    return strlen(payload) + ':' + payload + type
  },
}

function strlen(str: string) {
  let len = 0
  let i = str.length
  while (i--) {
    const ch = str.charCodeAt(i)
    if (ch <= 0x007f) {
      len += 1
    } else if (ch <= 0x07ff) {
      len += 2
    } else if (ch <= 0xffff) {
      len += 3
    } else if (ch <= 0x10ffff) {
      len += 4
    } else {
      // Realistically this should never happen
      throw Error(`Unsupported character: "${ch}"`)
    }
  }
  return len
}
