import React from 'react'
import { StyleSheet, Text, View, TouchableNativeFeedback, ScrollView, Button } from 'react-native'
import {getUser, onLogin, setCharacter, characterID} from './auth'
import {colors, BaseText, B} from './styles.js'

export class CharacterMenu extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      characters: []
    }
  }

  componentDidMount () {
    Promise.all([characterID, onLogin()]).then((promises) => {
      const characterID = promises[0]
      this.characters = getUser().collection('characters')
      this.unsubscribe = this.characters.onSnapshot(snapshot => {
        const characters = []
        snapshot.forEach(slot => {
          const character = slot.data()
          character.id = slot.id
          character.active = character.id === characterID
          characters.push(character)
        })
        characters.sort((a, b) => {
          return a.name < b.name ? -1 : 1
        })
        this.setState(state => {
          return {characters}
        })
      })
    })
  }

  componentWillUnmount () {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  render () {
    return (
      <ScrollView style={styles.menu}>
        <Text style={styles.header}>
          Tristan's DND Assistant
        </Text>

        <View>
          {
            this.state.characters.map(c => (
              <TouchableNativeFeedback
                key={c.id}
                onPress={() => this._pressed(c)}
                background={TouchableNativeFeedback.SelectableBackground()}>

                <View style={styles.characterItem}>
                  {
                    c.active ? <B>{c.name}</B> : <BaseText>{c.name}</BaseText>
                  }
                </View>
              </TouchableNativeFeedback>
            ))
          }
        </View>

        <Button
          title="New"
          onPress={() => this.newCharacter()}
        />
      </ScrollView>
    )
  }

  newCharacter () {
    this.characters.add({
      name: 'New Character #' + (this.state.characters.length + 1)
    })
  }

  _pressed (character) {
    setCharacter(character.id)
  }
}

const styles = StyleSheet.create({
  menu: {
    backgroundColor: 'white',
    flex: 1
  },
  characterItem: {
    padding: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: 1
  },
  header: {
    fontSize: 32,
    padding: 10,
    backgroundColor: colors.primary,
    color: colors.textPrimary,
  }
})
