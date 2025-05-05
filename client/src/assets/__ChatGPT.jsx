
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Button, TextInput, Pressable, Image, CheckBox, TouchableOpacity, ActivityIndicator } from 'react-native';
import Select from 'react-select'
import * as FaIcons from "react-icons/fa";
import * as AiIcons from "react-icons/ai";
import * as IoIcons from "react-icons/io";
import * as Io5Icons from "react-icons/io5";
import * as MdIcons from "react-icons/md";



const defaultSystemMessage = "You are a helpful assistant, you will be provided with a user query. Your task is to answer the query in norwegian and in a detailed and comprehensive way, using only the provided context information. If you find the answer used at least 100 words to answer. " +
    "If you don't find the answer in the provided context, answer in norwegian:\"Beklager, jeg fant ikke svaret i referansetekstene!\""

const timer = ms => new Promise(res => setTimeout(res, ms))
let webserverEndPoint = "";
if (process.env.NODE_ENV === 'development') {
    // You are running the app locally in development mode
    console.log('Running in development mode');
    webserverEndPoint = 'http://localhost:80/chat';
} else {
    // You are running the app in production or some other environment
    console.log('Running in production mode');
    webserverEndPoint = 'https://chatbot2-llama-server.azurewebsites.net/chat';
}

console.log('webserverEndPoint', webserverEndPoint);




export default function ChatGPT() {
    const [data, setData] = useState([]);
    const [textInput, setTextInput] = useState("");
    const [isTextInputFocused, setTextInputFocused] = useState(false)
    const [isSending, setImageVisibility] = useState(false);
    const [height, setHeight] = useState(80);
    const [similarity_top_k, setSimilarity_top_k] = useState("20");
    const [expandedSection1, setExpandedSection1] = useState(false);
    const [expandedSection2, setExpandedSection2] = useState(false);
    const [expandedSection3, setExpandedSection3] = useState(false);
    const [response_mode, setResponse_mode] = useState("tree_summarize");
    const [similarity_cutoff, setSimilarity_cutoff] = useState("0.7")
    const [systemMessage, setSystemMessage] = useState(defaultSystemMessage);
    const [tokenCounter, setTokenCounter] = useState(false);
    const [vectorIndex, setVectorIndex] = useState({ value: "prevensjonsguiden", label: "Prevensjonsguiden" });
    //const [refTextSelection, setRefTextSelection] = useState(true);

    const selectOptions = [
        { value: "prevensjonsguiden", label: "Prevensjonsguiden" },
        { value: "ungnomobbing", label: "Temaside om mobbing" },
        { value: "ungnoalkohol", label: "Temaside om alkohol" },
        { value: "ungno_canabis", label: "Temaside om canabis" },
        { value: "ungnotobakk", label: "Temaside om tobakk" },
        { value: "ungno100spmtobakk", label: "100 spørsmål&svar om tobakk" },
        { value: "ungno500spmtobakk", label: "500 spørsmål&svar om tobakk" },
        { value: "barneombudet", label: "Barneombudet - dine rettigheter" },
        { value: "helsenorgeverktoy", label: "Helsenorge - verktøy" },
        { value: "hvaerinnafor", label: "Seksuell atferd - hva er innafor" },
    ];


    function getVectorIndex(data) {

        if (data) {
            let value = data.value;
            return value;
        }
        return null;
    }

    function validateInputs(text, type) {
        if (text.length > 0) {
            let numreg = /^[0-9]+$/;
            let floatReg = /^[+-]?\d+(\.\d+)?$/; // Regular expression for float numbers (including integers)

            if (type === 'similarity_top_k') {
                if (numreg.test(text)) {
                    return true
                } else {
                    alert("please enter numbers only");
                    return false
                }
            }
            if (type === 'similarity_cutoff') {
                const floatValue = parseFloat(text);
                if (floatValue >= 0 && floatValue <= 1) {
                    return true;
                } else {
                    alert("Please enter a float between 0 and 1 only");
                    return false;
                }
            }
            if (type === 'systemMessage') {
                if (text.length === 0)
                    setSystemMessage(defaultSystemMessage);

            }

        }
        return true;
    }



    const toggleExpandedSection1 = () => {
        setExpandedSection1(!expandedSection1);
    };
    const toggleExpandedSection2 = () => {
        setExpandedSection2(!expandedSection2);
    };
    const toggleExpandedSection3 = () => {
        setExpandedSection3(!expandedSection3);
    };


    const toggleImageVisibility = () => {
        setImageVisibility(!isSending);
    };
    const hideImage = () => {
        setImageVisibility(false);
    }

    const list = useRef(null);

    const clearInput = () => {
        setTextInput("");
        setHeight(80);
    };
    const clearAll = () => {
        clearInput();
        setData([]);
        hideImage();
    };

    const seperator = () => {
        return (
            <View style={styles.seperator} />
        )
    };

    const handleChangeResponse_mode = (event) => {
        setResponse_mode(event.target.value);
    };
    const handleChangeVectorIndex = (event) => {
        setVectorIndex(event.target.value);
    };

    async function readAndDisplayResponse(response, display, existingResp) {
        const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .getReader();
        let first10 = "";
        let text = "";
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                } else {
                    let chunk = value;
                    first10 = "";
                    while (true) {
                        if (chunk.length > 10) {
                            // noen chunk kan være store, behov for å stykke de opp
                            first10 = chunk.slice(0, 10);
                            text += first10;
                            if (display) {
                                //console.log('test:', text);
                                setData([...data, { type: 'user', buttonText: "USER", 'text': textInput },
                                { type: 'bot', buttonText: "ASSISTENT", 'text': existingResp + text }]);
                            }
                            chunk = chunk.slice(10);
                            await timer(20);
                        } else {
                            text += chunk;
                            if (display) {
                                setData([...data, { type: 'user', buttonText: "USER", 'text': textInput },
                                { type: 'bot', buttonText: "ASSISTENT", 'text': existingResp + text }]);
                            }
                            break;
                        }
                    }
                }

            }
        } catch (error) {
            // Handle any errors that occur during reading
            console.error("Error reading the stream:", error);
        } finally {
            // Close the reader when you're done with it to release resources
            reader.releaseLock();
        }

        return text;
    }


    const handleSend = async () => {

        //"Prefer shorter answers. Keep your response to 100 words or less.",

        try {

            let completeRespText = "";

            const response = await fetch(webserverEndPoint, {
                method: 'POST',
                headers: {
                    "Cache-Control": "no-cache",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [{
                        role: "system",
                        content: systemMessage,
                    }, {
                        role: "user",
                        content: "Query: " + textInput
                    }],
                    similarity_top_k: similarity_top_k,
                    response_mode: response_mode,
                    similarity_cutoff: similarity_cutoff,
                    tokenCounter: tokenCounter,
                    vectorIndex: getVectorIndex(vectorIndex),
                    stream: true,
                }),
            });
            clearInput();

            // update only userinput
            setData([...data, { type: 'user', buttonText: "USER", 'text': textInput },
            { type: 'bot', buttonText: "ASSISTENT", 'text': completeRespText }]);
            console.log("resp:", response);

            await readAndDisplayResponse(response, true, completeRespText);

            hideImage();

        } catch (error) {
            console.log("error", error);
            hideImage();
        }

    }


    return (


        <View style={styles.container}>



            <View style={[styles.row, { minHeight: 20, flexDirection: 'row', }]}>
                <View style={[styles.col1, { flex: 2, }]}>
                </View>
                <View style={[styles.col3, { flex: 8, }]}>
                    <Text style={[styles.title, { textAlign: 'left' }]}>HelseSvar</Text>
                    <Select
                        options={selectOptions}
                        menuPortalTarget={document.querySelector('body')}
                        placeholder='Velg tema:'
                        //closeMenuOnSelect={false}
                        onChange={(data) => setVectorIndex(data)}
                        defaultValue={selectOptions[0]}
                        styles={selectStyles}
                        //isMulti
                        isClearable
                        isSearchable
                    />
                </View>

                <View style={[styles.col1, { flex: 2 }]}>
                </View>
            </View>

            <View style={[styles.row, { minHeight: 300, }]}>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
                <View style={[styles.col2, { minHeight: 300, maxHeight: 900, flex: 8 }]}>

                    <FlatList
                        ref={list}
                        data={data}
                        keyExtractor={(item, index) => index.toString()}
                        ItemSeparatorComponent={seperator}
                        ListFooterComponent={<View style={{ height: 20, }} />}
                        style={[styles.body, { borderRadius: 4 }]}
                        onContentSizeChange={() => list.current.scrollToEnd({ animated: true })}
                        //inverted
                        renderItem={({ item, index }) => (
                            <View style={[{ flexDirection: 'row', padding: 2, /* backgroundColor: getBackgroundColor(item)*/ }]}>
                                <Text style={item.type === 'user' ? styles.roleUser : styles.roleAssistent}>{item.buttonText} </Text><Text style={styles.bot}>{item.text}</Text>
                            </View>
                        )}
                    />

                </View>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
            </View>

            <View style={[styles.row, { minHeight: 100 }]}>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
                <View style={[styles.col2, { flex: 8 }]}>

                    <View style={{
                        flexDirection: 'row',
                        width: window.width,
                        margin: 2,
                        padding: 2,
                        alignItems: 'center',
                        //justifyContent: 'center', 
                        borderWidth: 1,
                        borderColor: '#025169',
                        borderRadius: 10,
                        backgroundColor: '#fff'
                    }}>

                        {/*                         <View style={{ flex: 4 }}>
                            <TextInput
                                onChangeText={(textEntry) => { this.setState({ searchText: textEntry }) }}
                                style={{ backgroundColor: 'transparent' }}
                                onSubmitEditing={() => { this.onSubmit(this.state.searchText) }}
                            />
                        </View> */}
                        <TextInput
                            style={[styles.prompt, { height: Math.max(80, height), width: "100%", outlineStyle: 'none', borderColor: isTextInputFocused === true ? 'red' : 'red', borderWidth: 1, }]}
                            placeholder="Angi spørsmålet her.."
                            spellCheck="false"
                            readOnly={false}
                            multiline
                            rows={5}
                            maxLength={1000}
                            value={textInput}
                            onContentSizeChange={(e) => {
                                const newHeight = e.nativeEvent.contentSize.height;
                                setHeight(newHeight);
                            }}
                            onChangeText={text => setTextInput(text)}
                            onFocus={() => setTextInputFocused(true)}
                            onBlur={() => setTextInputFocused(false)}
                            onSubmitEditing={() => setTextInputFocused(false)}
                            onEndEditing={() => setTextInputFocused(false)}
                        />
                        <View>
                            {!isSending && (

                                <Pressable
                                    /* style={[styles.button, { marginBottom: 2 }]} */
                                    onPress={() => { handleSend(); toggleImageVisibility(); }}
                                >
                                    {
                                        isTextInputFocused ? <MdIcons.MdSend style={styles.gifStyle} /> : <Io5Icons.IoSendOutline style={styles.gifStyle} />

                                    }



                                </Pressable>
                            )}
                            {isSending && (
                                <View style={[styles.horizontal]}>
                                    <ActivityIndicator size="small" color="#0000ff" />
                                </View>
                            )}
                        </View>
                    </View>



                    {/*              <TextInput
                        style={[styles.prompt, { height: Math.max(80, height) }]}
                        placeholder="Angi spørsmålet her.."
                        spellCheck="false"
                        readOnly={false}
                        multiline
                        rows={5}
                        maxLength={1000}
                        value={textInput}
                        onContentSizeChange={(e) => {
                            const newHeight = e.nativeEvent.contentSize.height;
                            setHeight(newHeight);
                        }}
                        onChangeText={text => setTextInput(text)}

                    /> */}
                </View>
                <View style={[styles.col1, { flex: 2 }]}>
                    {!isSending && (
                        <Pressable
                            style={[styles.button, { marginBottom: 2 }]}
                            onPress={() => { handleSend(); toggleImageVisibility(); }}
                        >
                            <Text style={styles.subtitle}>Send</Text>
                        </Pressable>
                    )}
                    {isSending && (
                        // <Image
                        //     source={require("./assets/IMG_2416.GIF")}
                        //     style={styles.gifStyle}
                        // />
                        <View style={[styles.horizontal]}>
                            <ActivityIndicator size="small" color="#0000ff" />
                        </View>
                    )}
                    <Pressable
                        style={styles.button}
                        onPress={() => { clearAll(); }}
                    >
                        <Text style={styles.subtitle}>Slett</Text>
                    </Pressable>
                </View>
            </View>


            <View style={[styles.row, { minHeight: 1000, }]}>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
                <View style={[styles.col2, { flex: 8, }]}>

                    <TouchableOpacity onPress={toggleExpandedSection2}>
                        <View style={[styles.row, { backgroundColor: '#dcdcdc' }]}>
                            {expandedSection2 && (<Image
                                source={require("./assets/down.png")}
                                style={[styles.gifExpandStyle,]}
                            />)}
                            {!expandedSection2 && (<Image
                                source={require("./assets/right.png")}
                                style={[styles.gifExpandStyle,]}
                            />)}
                            <Text style={[styles.ingress, { textAlign: 'left' },]}>Innstillinger</Text>
                        </View>
                    </TouchableOpacity>
                    {expandedSection2 && (
                        <View style={[styles.col2, { backgroundColor: '#f5f5f5' }]}>
                            <View style={[styles.row, { paddingTop: 8 }]}>
                                <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20 }]}>Instruksjon:</Text>

                                <TextInput
                                    style={[styles.prompt, { width: "100%" }]}
                                    placeholder={defaultSystemMessage}
                                    spellCheck="false"
                                    readOnly={false}
                                    multiline
                                    rows={4}
                                    maxLength={1000}
                                    value={systemMessage}
                                    onChangeText={text => setSystemMessage(text)}
                                />
                            </View>

                            <View style={[styles.row, { paddingTop: 8 }]}>
                                <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20 }]}>Vis ChatGPT kost:</Text>
                                <CheckBox
                                    value={tokenCounter}
                                    onValueChange={setTokenCounter}
                                    style={styles.checkbox}
                                    color='grey'
                                />

                            </View>

                        </View>
                    )}

                    <TouchableOpacity onPress={toggleExpandedSection3}>
                        <View style={[styles.row, { backgroundColor: '#dcdcdc' }]}>
                            {expandedSection3 && (<Image
                                source={require("./assets/down.png")}
                                style={[styles.gifExpandStyle,]}
                            />)}
                            {!expandedSection3 && (<Image
                                source={require("./assets/right.png")}
                                style={[styles.gifExpandStyle,]}
                            />)}
                            <Text style={[styles.ingress, { textAlign: 'left' },]}>Tuning</Text>
                        </View>
                    </TouchableOpacity>
                    {expandedSection3 && (
                        <View style={[styles.col2, { backgroundColor: '#f5f5f5' }]}>

                            <View style={[styles.row, { paddingTop: 8 }]}>
                                <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20 }]}>similarity_top_k:</Text>
                                <TextInput
                                    style={[styles.input, { textAlign: 'right' }, { borderRadius: 4 }, { width: 50 },]}
                                    editable
                                    value={similarity_top_k}
                                    onChangeText={(text) => { if (validateInputs(text, 'similarity_top_k')) { setSimilarity_top_k(text); } }}
                                />
                            </View>
                            <View style={[styles.row, { paddingTop: 8 }]}>

                                <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20 }]}>response_mode:</Text>
                                <select style={styles.selectContainer}
                                    value={response_mode}
                                    onChange={handleChangeResponse_mode}>
                                    <option value="refine">refine</option>
                                    <option value="compact">compact</option>
                                    <option value="tree_summarize">tree_summarize</option>
                                    <option value="simple_summarize">simple_summarize</option>
                                    <option value="accumulate">accumulate</option>
                                    <option value="compact_accumulate">compact_accumulate</option>
                                </select>

                            </View>
                            <View style={[styles.row, { paddingTop: 8 }]}>
                                <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, }]}>similarity_cutoff:</Text>
                                <TextInput
                                    style={[styles.input, { textAlign: 'right' }, { borderRadius: 4 }, { width: 50 },]}
                                    editable
                                    value={similarity_cutoff}
                                    onChangeText={(text) => { if (validateInputs(text, 'similarity_cutoff')) { setSimilarity_cutoff(text); } }}
                                />
                            </View>
                        </View>

                    )}
                </View>

                <View style={[styles.col1, { flex: 2 }]}>

                </View>
            </View>


        </View>
    );
}


const selectStyles = {
    control: (base) => ({
        ...base,
        fontSize: '14px',
        fontWeight: 'normal',
        borderRadius: '8px',
        padding: '0px 0px',
        border: '1px solid #025169 !important',
        boxShadow: 'none',
        '&:focus': {
            border: '0 !important',
        },
    }),
}


const styles = StyleSheet.create({
    defaultStyles: {
        backgroundColor: 'red',
        padding: 20,
    },
    container: {
        alignItems: 'left',
        backgroundColor: 'red',
    },
    horizontal: {
        flexDirection: 'row',
        justifyContent: 'left',
        padding: 4,
    },

    row: {
        //justifyContent: 'space-between',
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },

    col: {
        flex: 1,
        width: 300,
        padding: 10,
        border: 1,
        textAlign: 'center'
    },
    col1: {
        minWidth: 50,
        maxWidth: 800,
        padding: 5,
        border: 1,
        textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        backgroundColor: '#025169',
    },
    col2: {
        minWidth: 100,
        //maxWidth: 800,
        padding: 3,
        border: 1,
        textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        backgroundColor: '#f7f7f7',
    },
    col3: {
        minWidth: 100,
        //maxWidth: 800,
        padding: 3,
        border: 1,
        //textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        backgroundColor: '#f7f7f7',
    },

    title: {
        color: '#02636c',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 5,
    },
    ingress: {
        fontSize: 12,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
    },
    subtitle: {
        color: 'grey',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 1,
        marginTop: 1,
        paddingLeft: 10,
    },
    roleUser: {
        fontSize: 11,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
        backgroundColor: '#e1efe3',
        borderRadius: 3,
        minWidth: 65,
        height: 20,
        textAlign: 'center',
        padding: 2,
    },
    roleAssistent: {
        fontSize: 11,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
        backgroundColor: '#feeedb',
        borderRadius: 3,
        minWidth: 65,
        height: 20,
        textAlign: 'center',
        padding: 2,
    },
    body: {
        backgroundColor: 'white',
        width: '100%',
        margin: 0,
    },
    bot: {
        fontSize: 12,
        fontWeight: 'normal',
        padding: 4,
    },
    prompt: {
        fontSize: 12,
        fontWeight: 'normal',
        borderWidth: 0,
        borderColor: '#3699b6',
        backgroundColor: 'white',
        marginBottom: 10,
        borderRadius: 4,
        padding: 2,
    },
    input: {
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'center',
        //borderWidth: 1, // får feltet til å krasje..
        borderColor: 'darkgrey',
        backgroundColor: 'white',
        marginBottom: 10,
        borderRadius: 4,
        padding: 2,
        position: 'absolute',
        marginLeft: 130, // Space between Text and Select
    },

    button: {
        alignItems: 'center',
        backgroundColor: '#DDDDDD',
        padding: 1,
        borderWidth: 0.5,
        borderColor: 'grey',
        borderRadius: 2,
        justifyContent: 'center',
        width: 50,
        height: 20,
    },
    btnPress: {
        alignItems: 'center',
        backgroundColor: 'red',
        padding: 1,
        borderWidth: 0.5,
        borderColor: 'grey',
        borderRadius: 2,
        justifyContent: 'center',
        width: 50,
    },
    buttonText: {
        fontSize: 25,
        fontWeight: 'bold',
        color: 'blue'
    },
    gifStyle: {
        width: 50,
        height: 25,
    },
    gifExpandStyle: {
        width: 15,
        height: 15,
    },
    seperator: {
        height: 1,
        width: "100%",
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    checkbox: {
        alignSelf: 'center',
        border: '1px solid white',
    },
    selectContainer: {
        fontSize: 12,
        position: 'absolute',
        marginLeft: 130, // Space between Text and Select
    },
    selectContainer2: {
        fontSize: 12,
        position: 'absolute',
        marginLeft: 75, // Space between Text and Select
    },
    styles: {
        fontSize: 14,
        color: 'blue',
    }
});


