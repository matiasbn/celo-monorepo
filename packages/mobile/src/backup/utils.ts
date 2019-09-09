import * as _ from 'lodash'
import { AsyncStorage } from 'react-native'
import { generateMnemonic, wordlists } from 'react-native-bip39'
import { getKey, setKey } from 'src/utils/keyStore'
import Logger from 'src/utils/Logger'

const TAG = 'Backup/utils'
const MNEMONIC_SPLITS = 2

export async function createQuizWordList(mnemonic: string, language: string | null) {
  const disallowedWordSet = new Set(mnemonic.split(' '))
  const languageWordList = getWordlist(language)
  const wordOptions: string = await generateMnemonic(1000, null, languageWordList)
  const quizWordList = new Set(
    [...wordOptions.split(' ')].filter((word: string) => !disallowedWordSet.has(word))
  )
  return [...quizWordList]
}

export function selectQuizWordOptions(correctWord: string, allWords: string[], numOptions: number) {
  const wordOptions = []
  const correctWordPosition = Math.floor(Math.random() * numOptions)
  const randomWordIndexList = _.sampleSize([...Array(allWords.length).keys()], numOptions - 1)
  let randomWordIndex: number = 0

  for (let i = 0; i < numOptions; i++) {
    if (i === correctWordPosition) {
      wordOptions.push(correctWord)
      continue
    }

    wordOptions.push(allWords[randomWordIndexList[randomWordIndex]])
    randomWordIndex += 1
  }
  return wordOptions
}

export function getWordlist(language: string | null): string[] {
  switch (language) {
    case 'es': {
      return wordlists.ES
    }
    default: {
      return wordlists.EN
    }
  }
}

function getPrefixWords(wordlist: string[], words: number): string[] {
  // Use random words in sorted order for split phrase prefixes
  const prefixes = _.chain(wordlist)
    .sampleSize(words)
    .uniq()
    .value()
    .sort()

  if (prefixes.length < words) {
    throw new Error('Word list has duplicate words')
  }

  return prefixes
}

export function splitMnemonic(mnemonic: string, language: string | null): string[] {
  const mnemonicWords = mnemonic.split(' ')

  const wordlist = getWordlist(language)
  const prefixes = getPrefixWords(wordlist, MNEMONIC_SPLITS)

  const chunkSize = Math.ceil(mnemonicWords.length / MNEMONIC_SPLITS)
  return _.chunk(mnemonicWords, chunkSize).map((words, i) => [prefixes[i], ...words].join(' '))
}

function sortStringArray(a: string[], b: string[]): number {
  // localeCompare is slower -- https://jsperf.com/operator-vs-localecompage/3
  if (a[0] < b[0]) {
    return -1
  }

  if (a[0] > b[0]) {
    return 1
  }

  return 0
}

export function joinMnemonic(mnemonicShards: string[]) {
  return mnemonicShards
    .map((shard) => shard.split(' '))
    .sort(sortStringArray)
    .map((shard) => shard.slice(1).join(' '))
    .join(' ')
}

// TODO(Rossy) Remove after the next alfa testnet reset
export async function getStoredMnemonic(): Promise<string | null> {
  try {
    Logger.debug(TAG, 'Checking keystore for mnemonic')
    let mnemonic = await getKey('mnemonic')
    if (mnemonic) {
      return mnemonic
    }

    Logger.debug(TAG, 'Mnemonic not found in keystore, checking async storage')
    mnemonic = await AsyncStorage.getItem('mnemonic')
    if (mnemonic) {
      await setKey('mnemonic', mnemonic)
      await AsyncStorage.removeItem('mnemonic')
      return mnemonic
    }

    Logger.error(TAG, 'No mnemonic found')
    return null
  } catch (error) {
    Logger.error(TAG, 'Failed to retrieve mnemonic', error)
    return null
  }
}
