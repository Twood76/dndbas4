import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import SpellBook from './SpellBook.js'

export default class App extends React.Component {
  render() {
    return (
      <View style={styles.container}>
        <SpellBook>
        </SpellBook>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  }
})
